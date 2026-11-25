/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CoreContext } from '@kbn/core-base-browser-internal';
import type { InternalHttpSetup } from '@kbn/core-http-browser-internal';
import type { InternalInjectedMetadataSetup } from '@kbn/core-injected-metadata-browser-internal';
import type { OverlayStart } from '@kbn/core-overlays-browser';
import type { RenderingService } from '@kbn/core-rendering-browser';
import type { Logger } from '@kbn/logging';
import type {
  EvaluationContext,
  FeatureFlagsSetup,
  InternalFeatureFlagsStart,
  MultiContextEvaluationContext,
} from '@kbn/core-feature-flags-browser';
import { apm } from '@elastic/apm-rum';
import {
  type Client,
  type EvaluationDetails,
  ClientProviderEvents,
  OpenFeature,
} from '@openfeature/web-sdk';
import deepMerge from 'deepmerge';
import { useMemo } from 'react';
import type { Observable } from 'rxjs';
import { filter, map, merge, startWith, Subject } from 'rxjs';
import { useObservable, type ValueObservable } from '@kbn/use-observable';
import { buildPath } from '@kbn/core-http-browser';
import { getFlattenedObject, withTimeout } from '@kbn/std';
import { createKibanaOfrepProvider } from './kibana_ofrep_provider';

/**
 * setup method dependencies
 * @internal
 */
export interface FeatureFlagsSetupDeps {
  /**
   * Used to hit the counter endpoint.
   */
  http: InternalHttpSetup;
  /**
   * Used to read the flag overrides set up in the configuration file.
   */
  injectedMetadata: InternalInjectedMetadataSetup;
}

/**
 * The browser-side Feature Flags Service
 * @internal
 */
type FeatureFlagValue = boolean | string | number;
type FeatureFlagValueType = 'boolean' | 'string' | 'number';

const HELPER_STORAGE_KEY = 'core.featureFlags.helper.enabled';
/** Enough for every flag Kibana evaluates, with room for experiments. */
const MAX_TRACKED_EVALUATIONS = 1000;

export interface FeatureFlagsHelperDeps {
  http: InternalHttpSetup;
  overlays: Pick<OverlayStart, 'openFlyout'>;
  rendering: Pick<RenderingService, 'addContext'>;
}

declare global {
  var toggleFeatureFlagsHelper: (() => void) | undefined;
}

interface ReportedFlagValue {
  type: FeatureFlagValueType;
  value: FeatureFlagValue;
  reason?: string;
}

/** Injected provider values, with `feature_flags.overrides` winning. */
function seedFlags(
  injectedMetadata: ReturnType<InternalInjectedMetadataSetup['getFeatureFlags']>
): Record<string, unknown> {
  if (!injectedMetadata) {
    return {};
  }
  return {
    ...injectedMetadata.initialFeatureFlags,
    ...getFlattenedObject(injectedMetadata.overrides ?? {}),
  };
}

const getFeatureFlagValueType = (value: FeatureFlagValue): FeatureFlagValueType => {
  if (typeof value === 'boolean') {
    return 'boolean';
  }

  if (typeof value === 'number') {
    return 'number';
  }

  return 'string';
};

/** Lets useObservable reseed during render when the flag or fallback changes. */
function withSyncValue<T extends FeatureFlagValue>(
  source$: Observable<T>,
  readValue: () => T
): ValueObservable<T> {
  return {
    subscribe: (listener) => source$.subscribe(listener),
    getValue: readValue,
  };
}

/** Subscribes to a flag and reads the synchronous evaluation on each render that changes arguments. */
function useFeatureFlagValue<T extends FeatureFlagValue>(
  flagName: string,
  fallbackValue: T,
  getValue$: (flagName: string, fallbackValue: T) => Observable<T>,
  getValue: (flagName: string, fallbackValue: T) => T
): T {
  const value$ = useMemo(
    () =>
      withSyncValue(getValue$(flagName, fallbackValue), () => getValue(flagName, fallbackValue)),
    [getValue$, getValue, flagName, fallbackValue]
  );
  return useObservable(value$);
}

export class FeatureFlagsService {
  private readonly featureFlagsClient: Client;
  private readonly logger: Logger;
  private readonly contextChanged$ = new Subject<void>();
  private readonly lastReportedValues = new Map<string, ReportedFlagValue>();
  /** Last value returned for each flag this page has evaluated. */
  private readonly evaluatedFlags = new Map<string, FeatureFlagValue>();
  private helperDeps?: FeatureFlagsHelperDeps;
  private unmountHelper?: () => void;
  private openHelper?: () => void;
  private closeHelperFlyout?: () => void;
  private setMountedCornerButtonVisible?: (visible: boolean) => void;
  private mountingHelper?: Promise<void>;
  /** Remembered in localStorage. Independent of the developer toolbar pill. */
  private cornerButtonVisible = false;
  private isProviderReadyPromise?: Promise<void>;
  private context: MultiContextEvaluationContext = { kind: 'multi' };
  private http?: InternalHttpSetup;

  /**
   * The core service's constructor
   * @param core {@link CoreContext}
   */
  constructor(core: CoreContext) {
    this.logger = core.logger.get('feature-flags-service');
    this.featureFlagsClient = OpenFeature.getClient();
    OpenFeature.setLogger(this.logger.get('open-feature'));
  }

  /**
   * Setup lifecycle method
   * @param deps {@link FeatureFlagsSetup} including the {@link InternalInjectedMetadataSetup} used to retrieve the feature flags.
   */
  public setup(deps: FeatureFlagsSetupDeps): FeatureFlagsSetup {
    const featureFlagsInjectedMetadata = deps.injectedMetadata.getFeatureFlags();
    this.http = deps.http;
    this.installProvider(deps.http, featureFlagsInjectedMetadata);
    return {
      getInitialFeatureFlags: () => featureFlagsInjectedMetadata?.initialFeatureFlags ?? {},
      appendContext: (contextToAppend) => this.appendContext(contextToAppend),
    };
  }

  /**
   * Start lifecycle method
   */
  public async start(): Promise<InternalFeatureFlagsStart> {
    const featureFlagsChanged$ = new Subject<string[]>();
    this.featureFlagsClient.addHandler(ClientProviderEvents.ConfigurationChanged, (event) => {
      if (event?.flagsChanged) {
        featureFlagsChanged$.next(event.flagsChanged);
      }
    });
    const observeFeatureFlag$ = (flagName: string) =>
      merge(
        // Flag changes
        featureFlagsChanged$,
        // Context changes (we need to reevaluate)
        this.contextChanged$.pipe(map(() => [flagName]))
      ).pipe(
        filter((flagNames) => flagNames.includes(flagName)),
        startWith([flagName]) // only to emit on the first call
      );

    try {
      await this.waitForProviderInitialization();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Feature flags provider failed to initialize. Evaluations use fallbacks until it recovers: ${message}`
      );
    }

    const getBooleanValue = (flagName: string, fallbackValue: boolean) =>
      this.evaluateFlag(this.featureFlagsClient.getBooleanDetails, flagName, fallbackValue);
    const getBooleanValue$ = (flagName: string, fallbackValue: boolean) =>
      observeFeatureFlag$(flagName).pipe(map(() => getBooleanValue(flagName, fallbackValue)));
    const getStringValue = <Value extends string>(flagName: string, fallbackValue: Value) =>
      this.evaluateFlag<Value>(this.featureFlagsClient.getStringDetails, flagName, fallbackValue);
    const getStringValue$ = <Value extends string>(flagName: string, fallbackValue: Value) =>
      observeFeatureFlag$(flagName).pipe(map(() => getStringValue(flagName, fallbackValue)));
    const getNumberValue = <Value extends number>(flagName: string, fallbackValue: Value) =>
      this.evaluateFlag<Value>(this.featureFlagsClient.getNumberDetails, flagName, fallbackValue);
    const getNumberValue$ = <Value extends number>(flagName: string, fallbackValue: Value) =>
      observeFeatureFlag$(flagName).pipe(map(() => getNumberValue(flagName, fallbackValue)));

    const useBooleanValue = (flagName: string, fallbackValue: boolean): boolean =>
      useFeatureFlagValue(flagName, fallbackValue, getBooleanValue$, getBooleanValue);
    const useStringValue = <Value extends string>(flagName: string, fallbackValue: Value): Value =>
      useFeatureFlagValue(flagName, fallbackValue, getStringValue$, getStringValue);
    const useNumberValue = <Value extends number>(flagName: string, fallbackValue: Value): Value =>
      useFeatureFlagValue(flagName, fallbackValue, getNumberValue$, getNumberValue);

    return {
      appendContext: (contextToAppend) => this.appendContext(contextToAppend),
      getBooleanValue$,
      useBooleanValue,
      getStringValue$,
      useStringValue,
      getNumberValue$,
      useNumberValue,
      helper: {
        open: () => {
          void this.openHelperFlyout();
        },
      },
    };
  }

  /**
   * Stop lifecycle method
   */
  public async stop() {
    this.unmountHelper?.();
    this.unmountHelper = undefined;
    this.openHelper = undefined;
    this.closeHelperFlyout = undefined;
    this.setMountedCornerButtonVisible = undefined;
    await OpenFeature.close();
  }

  /**
   * Asks the provider to fetch the server snapshot now, instead of waiting for the next poll.
   */
  public async refresh(): Promise<void> {
    await OpenFeature.setContext(this.context);
  }

  /**
   * Exposes `toggleFeatureFlagsHelper()` on the page. The helper UI stays out of the
   * page-load bundle until the corner button or the developer toolbar opens it.
   */
  public registerHelper(deps: FeatureFlagsHelperDeps): void {
    this.helperDeps = deps;
    this.cornerButtonVisible = localStorage.getItem(HELPER_STORAGE_KEY) === 'true';
    this.logger.info(
      'Run toggleFeatureFlagsHelper() in the browser console to show or hide the feature flags helper button.'
    );
    globalThis.toggleFeatureFlagsHelper = () => {
      void this.setCornerButtonVisible(!this.cornerButtonVisible);
    };
    if (this.cornerButtonVisible) {
      void this.ensureHelperMounted();
    }
  }

  /** Opens the flyout. Does not change the corner button or its localStorage value. */
  private async openHelperFlyout(): Promise<void> {
    await this.ensureHelperMounted();
    this.openHelper?.();
  }

  /** Shows or hides the corner button. Hiding it closes an open flyout. */
  private async setCornerButtonVisible(visible: boolean): Promise<void> {
    this.cornerButtonVisible = visible;
    localStorage.setItem(HELPER_STORAGE_KEY, String(visible));
    if (visible) {
      await this.ensureHelperMounted();
      this.setMountedCornerButtonVisible?.(true);
      this.logger.info('Feature flags helper button shown.');
      return;
    }

    if (this.mountingHelper) {
      await this.mountingHelper;
    }
    this.setMountedCornerButtonVisible?.(false);
    this.closeHelperFlyout?.();
    this.logger.info('Feature flags helper button hidden.');
  }

  private async ensureHelperMounted(): Promise<void> {
    if (this.unmountHelper || !this.helperDeps) {
      return;
    }
    this.mountingHelper ??= this.mountHelper();
    await this.mountingHelper;
  }

  private async mountHelper(): Promise<void> {
    const deps = this.helperDeps;
    if (!deps) {
      return;
    }
    try {
      const { mountFeatureFlagsHelper } = await import('./helper');
      if (this.unmountHelper || !this.helperDeps) {
        return;
      }
      const mounted = mountFeatureFlagsHelper({
        http: deps.http,
        overlays: deps.overlays,
        rendering: deps.rendering,
        refreshFlags: () => this.refresh(),
        getBrowserEvaluations: () => this.getEvaluatedFlags(),
        cornerButtonVisible: this.cornerButtonVisible,
      });
      this.unmountHelper = mounted.unmount;
      this.openHelper = mounted.open;
      this.closeHelperFlyout = mounted.close;
      this.setMountedCornerButtonVisible = mounted.setCornerButtonVisible;
      mounted.setCornerButtonVisible(this.cornerButtonVisible);
    } finally {
      this.mountingHelper = undefined;
    }
  }

  /**
   * Installs the Kibana OFREP provider. Injected flags and config overrides are served until the first response.
   */
  private installProvider(
    http: InternalHttpSetup,
    injectedMetadata: ReturnType<InternalInjectedMetadataSetup['getFeatureFlags']>
  ): void {
    const transaction = apm.startTransaction('set-provider', 'feature-flags');
    const provider = createKibanaOfrepProvider({
      http,
      initialFlags: seedFlags(injectedMetadata),
      logger: this.logger,
    });
    this.isProviderReadyPromise = OpenFeature.setProviderAndWait(provider);
    this.isProviderReadyPromise
      .then(() => {
        if (transaction) {
          // @ts-expect-error RUM types are not correct
          transaction.outcome = 'success';
          transaction.end();
        }
      })
      .catch((err) => {
        this.logger.error(err);
        apm.captureError(err);
        if (transaction) {
          // @ts-expect-error RUM types are not correct
          transaction.outcome = 'failure';
          transaction.end();
        }
      });

    // Reevaluate subscribed flags once the provider is ready.
    OpenFeature.addHandler(ClientProviderEvents.Ready, () => this.contextChanged$.next());
  }

  /**
   * Waits for the provider initialization with a timeout to avoid holding the page load for too long
   * @internal
   */
  private async waitForProviderInitialization() {
    // Adding a timeout here to avoid hanging the start for too long if the provider is unresponsive
    if (!this.isProviderReadyPromise) {
      return;
    }
    const outcome = await withTimeout({
      promise: this.isProviderReadyPromise,
      timeoutMs: 2 * 1000,
    });
    if (outcome.timedout) {
      const msg = `The feature flags provider took too long to initialize.
        Won't hold the page load any longer.
        Feature flags will return the provided fallbacks until the provider is eventually initialized.`;
      this.logger.warn(msg);
      // Flag the transaction as slow so that we can quantify how often it happens
      apm.getCurrentTransaction()?.addLabels({ slow_setup: true });
    }
  }

  /**
   * Wrapper to evaluate flags with the common config overrides interceptions + APM and counters reporting
   * @param evaluationFn The actual evaluation API
   * @param flagName The name of the flag to evaluate
   * @param fallbackValue The fallback value
   * @internal
   */
  private evaluateFlag<T extends FeatureFlagValue>(
    evaluationFn: (flagName: string, fallbackValue: T) => EvaluationDetails<T>,
    flagName: string,
    fallbackValue: T
  ): T {
    // Bind the evaluation or the client will lose its internal context.
    // Overrides are already part of the server snapshot this provider reads
    // and are taken into account in the `initialFlags` property when bootstrapping the client.
    const { value, reason } = evaluationFn.bind(this.featureFlagsClient)(flagName, fallbackValue);
    apm.addLabels({ [`flag_${flagName.replaceAll('.', '_')}`]: value });

    this.rememberEvaluation(flagName, value);
    this.reportValueIfChanged(flagName, value, reason);

    return value;
  }

  /** Flags this page has evaluated. The helper uses these when the provider snapshot is empty. */
  public getEvaluatedFlags(): Array<{ key: string; value: FeatureFlagValue }> {
    return [...this.evaluatedFlags.entries()].map(([key, value]) => ({ key, value }));
  }

  /** Keeps the helper's flag list populated when the provider has no snapshot. */
  private rememberEvaluation(flagName: string, value: FeatureFlagValue): void {
    if (!this.evaluatedFlags.has(flagName) && this.evaluatedFlags.size >= MAX_TRACKED_EVALUATIONS) {
      return;
    }
    this.evaluatedFlags.set(flagName, value);
  }

  private reportValueIfChanged(
    flagName: string,
    value: FeatureFlagValue,
    reason: string | undefined
  ): void {
    if (!this.shouldReportValue(flagName, value, reason)) {
      return;
    }

    // Increment usage counter
    // TODO: When UI has OTel instrumented, we can increment the counter in the browser directly.
    this.http
      ?.post(buildPath('/internal/feature-flags/{flagName}/counter', { flagName }), {
        body: JSON.stringify({ value, reason }),
      })
      .catch(() => {});
  }

  private shouldReportValue(
    flagName: string,
    value: FeatureFlagValue,
    reason: string | undefined
  ): boolean {
    const type = getFeatureFlagValueType(value);
    const lastReportedValue = this.lastReportedValues.get(flagName);
    // Object.is takes care string, number (incl. NaN), boolean comparison
    if (
      lastReportedValue?.type === type &&
      Object.is(lastReportedValue.value, value) &&
      lastReportedValue.reason === reason
    ) {
      return false;
    }

    // Counter reporting is best effort; record before posting to cap attempts at one per unique value.
    this.lastReportedValues.set(flagName, { type, value, reason });
    return true;
  }

  /**
   * Formats the provided context to fulfill the expected multi-context structure.
   * @param contextToAppend The {@link EvaluationContext} to append.
   * @internal
   */
  private async appendContext(contextToAppend: EvaluationContext): Promise<void> {
    // If no kind provided, default to the project|deployment level.
    const { kind = 'kibana', ...rest } = contextToAppend;
    // Format the context to fulfill the expected multi-context structure
    const formattedContextToAppend: MultiContextEvaluationContext =
      kind === 'multi'
        ? (contextToAppend as MultiContextEvaluationContext)
        : { kind: 'multi', [kind]: rest };

    // Merge the formatted context to append to the global context, and set it in the OpenFeature client.
    this.context = deepMerge(this.context, formattedContextToAppend);
    await OpenFeature.setContext(this.context);
    this.contextChanged$.next();
  }
}
