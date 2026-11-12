/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Logger } from '@kbn/logging';
import type { OFREPWebProviderOptions } from '@openfeature/ofrep-web-provider';
import { OFREPWebProvider } from '@openfeature/ofrep-web-provider';
import type {
  EvaluationContext,
  JsonValue,
  Logger as OpenFeatureLogger,
  Provider,
  ResolutionDetails,
} from '@openfeature/web-sdk';
import {
  ClientProviderEvents,
  ErrorCode,
  OpenFeatureEventEmitter,
  ProviderFatalError,
  StandardResolutionReasons,
} from '@openfeature/web-sdk';

type FlagValueType = 'boolean' | 'string' | 'number' | 'object';

/** Delay before retrying a failed activation when the provider has no poll interval. */
const DEFAULT_RETRY_DELAY_MS = 10_000;

interface CachedEvaluation {
  value?: unknown;
  errorCode?: string;
}

/** The slice of {@link OFREPWebProvider} used after its first bulk evaluation. */
interface OfrepWebDelegate {
  initialize(context?: EvaluationContext, domain?: string): Promise<void>;
  resolveBooleanEvaluation(
    flagKey: string,
    defaultValue: boolean,
    context: EvaluationContext,
    logger?: OpenFeatureLogger
  ): ResolutionDetails<boolean>;
  resolveStringEvaluation(
    flagKey: string,
    defaultValue: string,
    context: EvaluationContext,
    logger?: OpenFeatureLogger
  ): ResolutionDetails<string>;
  resolveNumberEvaluation(
    flagKey: string,
    defaultValue: number,
    context: EvaluationContext,
    logger?: OpenFeatureLogger
  ): ResolutionDetails<number>;
  resolveObjectEvaluation<T extends JsonValue>(
    flagKey: string,
    defaultValue: T,
    context: EvaluationContext,
    logger?: OpenFeatureLogger
  ): ResolutionDetails<T>;
  onContextChange?(
    oldContext: EvaluationContext,
    newContext: EvaluationContext
  ): Promise<void> | void;
  onClose?(): Promise<void>;
  events?: OpenFeatureEventEmitter;
  readonly flagCache: Record<string, CachedEvaluation>;
}

const readFlagValue = (entry: CachedEvaluation | undefined): unknown => {
  if (!entry || entry.errorCode !== undefined || !('value' in entry)) {
    return undefined;
  }
  return entry.value;
};

export interface SeededOfrepWebProviderOptions {
  /** Connection options. `cacheMode` is fixed by this provider. */
  ofrep: Omit<OFREPWebProviderOptions, 'cacheMode'>;
  /** Values Kibana injected from the server evaluation, served until the first bulk response. */
  initialFlags: Record<string, unknown>;
  logger?: Pick<Logger, 'warn'>;
  /** Test seam. Defaults to {@link OFREPWebProvider}. */
  createProvider?: (options: OFREPWebProviderOptions) => OfrepWebDelegate;
}

/**
 * Config overrides are often the strings `"true"` and `"false"`.
 * Boolean evaluation used to return that raw string, which callers treat as truthy.
 */
const booleanOverride = (value: unknown): boolean | undefined => {
  if (typeof value === 'boolean') {
    return value;
  }
  if (value === 'true') {
    return true;
  }
  if (value === 'false') {
    return false;
  }
  return undefined;
};

const valueMatchesType = (value: unknown, type: FlagValueType): boolean => {
  if (type === 'object') {
    return typeof value === 'object' && value !== null;
  }
  return typeof value === type;
};

const sameValue = (left: unknown, right: unknown): boolean => {
  if (Object.is(left, right)) {
    return true;
  }
  return typeof left === 'object' && typeof right === 'object'
    ? JSON.stringify(left) === JSON.stringify(right)
    : false;
};

/**
 * Serves Kibana's injected flag values immediately, then delegates to {@link OFREPWebProvider}.
 * The web provider has no bootstrap option, and its cache stores full OFREP responses.
 */
export class SeededOfrepWebProvider implements Provider {
  readonly runsOn = 'client';
  readonly domainScoped = true;
  readonly metadata = { name: 'Kibana OFREP provider' };
  readonly events = new OpenFeatureEventEmitter();

  private readonly initialFlags: Record<string, unknown>;
  private readonly inner: OfrepWebDelegate;
  private readonly logger?: Pick<Logger, 'warn'>;
  private published: Record<string, unknown>;
  private context?: EvaluationContext;
  private domain?: string;
  private readonly retryDelayMs: number;
  private delegating = false;
  private closed = false;
  private reportedFailure = false;
  private retryTimer: ReturnType<typeof setTimeout> | undefined;

  constructor(options: SeededOfrepWebProviderOptions) {
    this.initialFlags = options.initialFlags;
    this.published = { ...options.initialFlags };
    this.logger = options.logger;
    this.retryDelayMs =
      typeof options.ofrep.pollInterval === 'number' && options.ofrep.pollInterval > 0
        ? options.ofrep.pollInterval
        : DEFAULT_RETRY_DELAY_MS;
    // network-first still accepts a localStorage snapshot, up to 30 days old, when the
    // first request fails. That snapshot would replace the seed Kibana just injected.
    const ofrepOptions: OFREPWebProviderOptions = {
      ...options.ofrep,
      cacheMode: 'disabled',
    };
    this.inner = options.createProvider
      ? options.createProvider(ofrepOptions)
      : new OFREPWebProvider(ofrepOptions);
    this.forwardEvents();
  }

  initialize(context?: EvaluationContext, domain?: string): Promise<void> {
    this.context = context;
    this.domain = domain;
    // The seed is served until the first response. An empty seed evaluates to fallbacks,
    // so startup does not wait for that request.
    void this.activate();
    return Promise.resolve();
  }

  onContextChange(
    oldContext: EvaluationContext,
    newContext: EvaluationContext
  ): Promise<void> | void {
    this.context = newContext;
    if (!this.delegating) {
      return;
    }
    return Promise.resolve(this.inner.onContextChange?.(oldContext, newContext)).then(() => {
      this.publishDivergence();
    });
  }

  async onClose(): Promise<void> {
    this.closed = true;
    this.clearRetry();
    await this.inner.onClose?.();
  }

  resolveBooleanEvaluation(
    flagKey: string,
    defaultValue: boolean,
    context: EvaluationContext,
    logger?: OpenFeatureLogger
  ): ResolutionDetails<boolean> {
    if (!this.delegating) {
      return this.fromSeed(flagKey, defaultValue, 'boolean');
    }

    const resolved = this.inner.resolveBooleanEvaluation(flagKey, defaultValue, context, logger);
    if (resolved.errorCode !== ErrorCode.TYPE_MISMATCH) {
      return resolved;
    }

    const coerced = booleanOverride(readFlagValue(this.inner.flagCache[flagKey]));
    if (coerced === undefined) {
      return resolved;
    }
    return {
      value: coerced,
      reason: StandardResolutionReasons.CACHED,
    };
  }

  resolveStringEvaluation(
    flagKey: string,
    defaultValue: string,
    context: EvaluationContext,
    logger?: OpenFeatureLogger
  ): ResolutionDetails<string> {
    return this.delegating
      ? this.inner.resolveStringEvaluation(flagKey, defaultValue, context, logger)
      : this.fromSeed(flagKey, defaultValue, 'string');
  }

  resolveNumberEvaluation(
    flagKey: string,
    defaultValue: number,
    context: EvaluationContext,
    logger?: OpenFeatureLogger
  ): ResolutionDetails<number> {
    return this.delegating
      ? this.inner.resolveNumberEvaluation(flagKey, defaultValue, context, logger)
      : this.fromSeed(flagKey, defaultValue, 'number');
  }

  resolveObjectEvaluation<T extends JsonValue>(
    flagKey: string,
    defaultValue: T,
    context: EvaluationContext,
    logger?: OpenFeatureLogger
  ): ResolutionDetails<T> {
    return this.delegating
      ? this.inner.resolveObjectEvaluation(flagKey, defaultValue, context, logger)
      : this.fromSeed(flagKey, defaultValue, 'object');
  }

  private activate(): Promise<void> {
    const initializedWith = this.context;
    return this.inner
      .initialize(initializedWith, this.domain)
      .then(async () => {
        if (this.closed) {
          return;
        }
        if (this.context !== initializedWith && this.context) {
          await this.inner.onContextChange?.(initializedWith ?? {}, this.context);
        }
        if (this.closed) {
          return;
        }
        this.delegating = true;
        this.publishDivergence();
      })
      .catch((error: unknown) => {
        const message = error instanceof Error ? error.message : String(error);
        this.logger?.warn(`OFREP provider failed to initialize: ${message}`);
        if (!this.reportedFailure) {
          this.reportedFailure = true;
          this.events.emit(ClientProviderEvents.Error, { message });
        }
        // The web provider only polls after a successful initialize, so a failed first request never recovers on its own.
        if (!this.closed && !(error instanceof ProviderFatalError)) {
          this.scheduleRetry();
        }
        // Keep the seed, or fallbacks when the seed is empty. A failed request must not reject startup.
      });
  }

  /** Tries activation again after a transient failure. A fatal provider error is not retried. */
  private scheduleRetry(): void {
    if (this.retryTimer !== undefined || this.closed || this.delegating) {
      return;
    }
    this.retryTimer = setTimeout(() => {
      this.retryTimer = undefined;
      if (this.closed || this.delegating) {
        return;
      }
      void this.activate();
    }, this.retryDelayMs);
  }

  private clearRetry(): void {
    if (this.retryTimer !== undefined) {
      clearTimeout(this.retryTimer);
      this.retryTimer = undefined;
    }
  }

  private forwardEvents(): void {
    this.inner.events?.addHandler(ClientProviderEvents.ConfigurationChanged, (details) => {
      if (!this.delegating || !details) {
        return;
      }
      this.published = this.currentValues();
      this.events.emit(ClientProviderEvents.ConfigurationChanged, details);
    });
    this.inner.events?.addHandler(ClientProviderEvents.Error, (details) => {
      if (this.delegating && details) {
        this.events.emit(ClientProviderEvents.Error, details);
      }
    });
    this.inner.events?.addHandler(ClientProviderEvents.Stale, (details) => {
      if (this.delegating && details) {
        this.events.emit(ClientProviderEvents.Stale, details);
      }
    });
  }

  private currentValues(): Record<string, unknown> {
    return Object.fromEntries(
      Object.entries(this.inner.flagCache).map(([key, evaluation]) => [
        key,
        readFlagValue(evaluation),
      ])
    );
  }

  /** Asks subscribers to re-read flags whose value changed since the last evaluation. */
  private publishDivergence(): void {
    const current = this.currentValues();
    const keys = new Set([...Object.keys(this.published), ...Object.keys(current)]);
    const flagsChanged = [...keys]
      .filter((key) => !sameValue(this.published[key], current[key]))
      .sort();
    this.published = current;
    if (flagsChanged.length === 0) {
      return;
    }
    this.events.emit(ClientProviderEvents.ConfigurationChanged, { flagsChanged });
  }

  private fromSeed<T extends JsonValue>(
    flagKey: string,
    defaultValue: T,
    type: FlagValueType
  ): ResolutionDetails<T> {
    if (!(flagKey in this.initialFlags) || this.initialFlags[flagKey] === undefined) {
      return {
        value: defaultValue,
        reason: StandardResolutionReasons.ERROR,
        errorCode: ErrorCode.FLAG_NOT_FOUND,
        errorMessage: `Flag '${flagKey}' was not in the injected feature flags.`,
      };
    }

    const value = this.initialFlags[flagKey];
    if (type === 'boolean') {
      const coerced = booleanOverride(value);
      if (coerced !== undefined) {
        return {
          value: coerced as T,
          reason: StandardResolutionReasons.CACHED,
        };
      }
    }
    if (!valueMatchesType(value, type)) {
      return {
        value: defaultValue,
        reason: StandardResolutionReasons.ERROR,
        errorCode: ErrorCode.TYPE_MISMATCH,
        errorMessage: `Flag '${flagKey}' is not a ${type}.`,
      };
    }

    return {
      value: value as T,
      reason: StandardResolutionReasons.CACHED,
    };
  }
}
