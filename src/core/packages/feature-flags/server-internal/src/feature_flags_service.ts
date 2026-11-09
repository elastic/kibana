/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CoreContext } from '@kbn/core-base-server-internal';
import type {
  EvaluationContext,
  FeatureFlagsSetup,
  FeatureFlagsStart,
  MultiContextEvaluationContext,
} from '@kbn/core-feature-flags-server';
import type { Logger } from '@kbn/logging';
import { addSpanLabels } from '@kbn/apm-utils';
import { getFlattenedObject } from '@kbn/std';
import {
  type Client,
  OpenFeature,
  ServerProviderEvents,
  NOOP_PROVIDER,
} from '@openfeature/server-sdk';
import deepMerge from 'deepmerge';
import {
  filter,
  switchMap,
  startWith,
  Subject,
  BehaviorSubject,
  pairwise,
  takeUntil,
  merge,
  map,
  firstValueFrom,
  timeout,
  timer,
  EMPTY,
} from 'rxjs';
import { get } from 'lodash';
import type { InitialFeatureFlagsGetter } from '@kbn/core-feature-flags-server/src/contracts';
import type { IRouter } from '@kbn/core-http-server';
import type { InternalHttpServiceSetup } from '@kbn/core-http-server-internal';
import type { ISavedObjectsRepository } from '@kbn/core-saved-objects-api-server';
import type {
  SavedObjectsServiceSetup,
  SavedObjectsServiceStart,
} from '@kbn/core-saved-objects-server';
import { SavedObjectsErrorHelpers } from '@kbn/core-saved-objects-server';
import { schema } from '@kbn/config-schema';
import { createOpenFeatureLogger } from './create_open_feature_logger';
import { setProviderWithRetries } from './set_provider_with_retries';
import { type FeatureFlagsConfig, featureFlagsConfig } from './feature_flags_config';
import { incrementCounter } from './increment_counter';
import { registerOfrepRoutes } from './ofrep_routes';
import { registerOverrideRoutes } from './overrides_routes';
import {
  FEATURE_FLAGS_OVERRIDES_SAVED_OBJECT_ID,
  FEATURE_FLAGS_OVERRIDES_SAVED_OBJECT_TYPE,
  featureFlagsOverridesSavedObjectType,
  normalizeOverrides,
  RUNTIME_OVERRIDES_POLL_INTERVAL_MS,
  type FeatureFlagOverrideValue,
  type FeatureFlagsOverridesAttributes,
} from './overrides_saved_object';

/**
 * Core-internal contract for the setup lifecycle step.
 * @internal
 */
export interface InternalFeatureFlagsSetup extends FeatureFlagsSetup {
  /**
   * Used by the rendering service to share the overrides with the service on the browser side.
   */
  getOverrides: () => Record<string, unknown>;
  /**
   * Required to bootstrap the browser-side OpenFeature client with a seed of the feature flags for faster load-times
   * and to work-around air-gapped environments.
   */
  getInitialFeatureFlags: () => Promise<Record<string, unknown>>;
}

export interface FeatureFlagsSetupDeps {
  http: InternalHttpServiceSetup;
  savedObjects: SavedObjectsServiceSetup;
}

export interface FeatureFlagsStartDeps {
  savedObjects: SavedObjectsServiceStart;
}

/** Enough for every flag Kibana evaluates, with room for experiments. */
const MAX_TRACKED_EVALUATIONS = 1000;

/**
 * Start contract used inside core. One-shot evaluation stays available for the HTTP
 * request-handler context. Plugin start contracts only receive {@link FeatureFlagsStart}.
 * @internal
 */
export interface InternalFeatureFlagsStart extends FeatureFlagsStart {
  /**
   * Evaluates a boolean flag for the current request-handler context.
   * @param flagName The flag ID to evaluate
   * @param fallbackValue If the flag cannot be evaluated for whatever reason, the fallback value is provided.
   */
  getBooleanValue(flagName: string, fallbackValue: boolean): Promise<boolean>;

  /**
   * Evaluates a string flag for the current request-handler context.
   * @param flagName The flag ID to evaluate
   * @param fallbackValue If the flag cannot be evaluated for whatever reason, the fallback value is provided.
   */
  getStringValue<Value extends string>(flagName: string, fallbackValue: Value): Promise<Value>;

  /**
   * Evaluates a number flag for the current request-handler context.
   * @param flagName The flag ID to evaluate
   * @param fallbackValue If the flag cannot be evaluated for whatever reason, the fallback value is provided.
   */
  getNumberValue<Value extends number>(flagName: string, fallbackValue: Value): Promise<Value>;
}

/**
 * Config overrides are often the strings `"true"` and `"false"`.
 * Boolean evaluation has to match the browser, which treats those strings as booleans.
 * The provider is not asked, so LaunchDarkly never performs this conversion.
 */
function overrideForEvaluation<T extends string | boolean | number>(
  override: unknown,
  fallbackValue: T
): T {
  if (typeof fallbackValue !== 'boolean') {
    return override as T;
  }
  if (typeof override === 'boolean') {
    return override as T;
  }
  if (override === 'true') {
    return true as T;
  }
  if (override === 'false') {
    return false as T;
  }
  return override as T;
}

/**
 * The server-side Feature Flags Service
 * @internal
 */
export class FeatureFlagsService {
  private readonly featureFlagsClient: Client;
  private readonly logger: Logger;
  private readonly stop$ = new Subject<void>();
  /** Overrides from `feature_flags.overrides` in the Kibana config. */
  private readonly configOverrides$ = new BehaviorSubject<Record<string, unknown>>({});
  /** Overrides stored in the feature-flags-overrides saved object. */
  private readonly runtimeOverrides$ = new BehaviorSubject<
    Record<string, FeatureFlagOverrideValue>
  >({});
  /** Config overrides with runtime overrides winning. Evaluation reads this. */
  private readonly overrides$ = new BehaviorSubject<Record<string, unknown>>({});
  private readonly contextChanged$ = new Subject<void>();
  private overridesRepository: ISavedObjectsRepository | undefined;
  private runtimeOverrideWriteCount = 0;
  private latestOverrideVersion: string | undefined;
  private stopped = false;
  private context: MultiContextEvaluationContext = { kind: 'multi' };
  private initialFeatureFlagsGetter: InitialFeatureFlagsGetter = async () => ({});
  private waitForContextReadyPromise: Promise<void> | undefined;
  /** Last value returned for each flag this node has evaluated. */
  private readonly evaluatedFlags = new Map<string, FeatureFlagOverrideValue>();

  /**
   * The core service's constructor
   * @param core {@link CoreContext}
   */
  constructor(private readonly core: CoreContext) {
    this.logger = core.logger.get('feature-flags-service');
    this.featureFlagsClient = OpenFeature.getClient();
    OpenFeature.setLogger(createOpenFeatureLogger(this.logger.get('open-feature')));
  }

  /**
   * Setup lifecycle method
   */
  public setup({ http, savedObjects }: FeatureFlagsSetupDeps): InternalFeatureFlagsSetup {
    savedObjects.registerType(featureFlagsOverridesSavedObjectType);

    // Register "overrides" to be changed via the dynamic config endpoint (enabled in test environments only)
    this.core.configService.addDynamicConfigPaths(featureFlagsConfig.path, ['overrides']);

    this.core.configService
      .atPath<FeatureFlagsConfig>(featureFlagsConfig.path)
      .subscribe(({ overrides = {} }) => {
        this.configOverrides$.next(getFlattenedObject(overrides));
        this.publishMergedOverrides();
      });

    this.registerRoutes(http);

    return {
      getOverrides: () => this.overrides$.value,
      getInitialFeatureFlags: () => this.initialFeatureFlagsGetter(),
      setInitialFeatureFlagsGetter: (getter: InitialFeatureFlagsGetter) => {
        this.initialFeatureFlagsGetter = getter;
      },
      setProvider: (provider) => {
        if (OpenFeature.providerMetadata !== NOOP_PROVIDER.metadata) {
          throw new Error('A provider has already been set. This API cannot be called twice.');
        }
        setProviderWithRetries(provider, this.logger);
        // Emit a context change event when the provider is ready to force the reevaluation of the subscribed flags.
        OpenFeature.addHandler(ServerProviderEvents.Ready, () => this.contextChanged$.next());
      },
      appendContext: (contextToAppend) => this.appendContext(contextToAppend),
    };
  }

  /**
   * Start lifecycle method
   */
  public start({ savedObjects }: FeatureFlagsStartDeps): InternalFeatureFlagsStart {
    this.overridesRepository = savedObjects.createInternalRepository([
      FEATURE_FLAGS_OVERRIDES_SAVED_OBJECT_TYPE,
    ]);

    const featureFlagsChanged$ = new Subject<string[]>();
    this.featureFlagsClient.addHandler(ServerProviderEvents.ConfigurationChanged, (event) => {
      if (event?.flagsChanged) {
        featureFlagsChanged$.next(event.flagsChanged);
      }
    });
    this.overrides$.pipe(pairwise(), takeUntil(this.stop$)).subscribe(([prev, next]) => {
      const mergedObject = { ...prev, ...next };
      const keys = Object.keys(mergedObject).filter(
        // Keep only the keys that have been removed or changed
        (key) => !Object.hasOwn(next, key) || next[key] !== prev[key]
      );
      featureFlagsChanged$.next(keys);
    });
    // Subscribe before the first poll so that poll's emission is observed.
    this.pollRuntimeOverrides(this.overridesRepository);
    const observeFeatureFlag$ = (flagName: string) =>
      merge(
        // Flag changes
        featureFlagsChanged$,
        // Context changes (we need to reevaluate)
        this.contextChanged$.pipe(map(() => [flagName]))
      ).pipe(
        filter((flagNames) => flagNames.includes(flagName)),
        startWith([flagName]), // only to emit on the first call
        takeUntil(this.stop$) // stop the observable when the service stops
      );

    return {
      appendContext: (contextToAppend) => this.appendContext(contextToAppend),
      getBooleanValue: async (flagName, fallbackValue) =>
        this.evaluateFlag(this.featureFlagsClient.getBooleanValue, flagName, fallbackValue),
      getStringValue: async <Value extends string>(flagName: string, fallbackValue: Value) =>
        await this.evaluateFlag<Value>(
          this.featureFlagsClient.getStringValue,
          flagName,
          fallbackValue
        ),
      getNumberValue: async <Value extends number>(flagName: string, fallbackValue: Value) =>
        await this.evaluateFlag<Value>(
          this.featureFlagsClient.getNumberValue,
          flagName,
          fallbackValue
        ),
      getBooleanValue$: (flagName, fallbackValue) => {
        return observeFeatureFlag$(flagName).pipe(
          switchMap(() =>
            this.evaluateFlag(this.featureFlagsClient.getBooleanValue, flagName, fallbackValue)
          )
        );
      },
      getStringValue$: <Value extends string>(flagName: string, fallbackValue: Value) => {
        return observeFeatureFlag$(flagName).pipe(
          switchMap(() =>
            this.evaluateFlag<Value>(
              this.featureFlagsClient.getStringValue,
              flagName,
              fallbackValue
            )
          )
        );
      },
      getNumberValue$: <Value extends number>(flagName: string, fallbackValue: Value) => {
        return observeFeatureFlag$(flagName).pipe(
          switchMap(() =>
            this.evaluateFlag<Value>(
              this.featureFlagsClient.getNumberValue,
              flagName,
              fallbackValue
            )
          )
        );
      },
    };
  }

  /**
   * Stop lifecycle method
   */
  public async stop() {
    this.stopped = true;
    try {
      await OpenFeature.close();
    } finally {
      this.stop$.next();
      this.stop$.complete();
      this.overrides$.complete();
      this.configOverrides$.complete();
      this.runtimeOverrides$.complete();
      this.contextChanged$.complete();
    }
  }

  /**
   * Wrapper to evaluate flags with the common config overrides interceptions + APM and counters reporting
   * @param evaluationFn The actual evaluation API
   * @param flagName The name of the flag to evaluate
   * @param fallbackValue The fallback value
   * @internal
   */
  private async evaluateFlag<T extends string | boolean | number>(
    evaluationFn: (flagName: string, fallbackValue: T) => Promise<T>,
    flagName: string,
    fallbackValue: T
  ): Promise<T> {
    const override = get(this.overrides$.value, flagName); // using lodash get because flagName can come with dots and the config parser might structure it in objects.

    // Only wait for the context to be ready if there is no override.
    if (typeof override === 'undefined') {
      // DISCLAIMER: During evaluations, we're only waiting for the context to be ready.
      // We don't check the provider's status because we don't want to halt Kibana if the provider is suffering any sort of downtime.
      // This is by design.
      await this.waitForContextReady();
    }

    const value =
      typeof override !== 'undefined'
        ? overrideForEvaluation(override, fallbackValue)
        : // We have to bind the evaluation or the client will lose its internal context
          await evaluationFn.bind(this.featureFlagsClient)(flagName, fallbackValue);

    addSpanLabels({ [`flag_${flagName.replaceAll('.', '_')}`]: value });

    // Report the counter for the flag evaluation.
    incrementCounter(flagName, value);
    this.rememberEvaluation(flagName, value);

    return value;
  }

  /** Keeps the helper's flag list populated when the provider has no snapshot. */
  private rememberEvaluation(flagName: string, value: FeatureFlagOverrideValue): void {
    if (!this.evaluatedFlags.has(flagName) && this.evaluatedFlags.size >= MAX_TRACKED_EVALUATIONS) {
      return;
    }
    this.evaluatedFlags.set(flagName, value);
  }

  /**
   * Formats the provided context to fulfill the expected multi-context structure.
   * @param contextToAppend The {@link EvaluationContext} to append.
   * @internal
   */
  private appendContext(contextToAppend: EvaluationContext): void {
    // If no kind provided, default to the project|deployment level.
    const { kind = 'kibana', ...rest } = contextToAppend;
    // Format the context to fulfill the expected multi-context structure
    const formattedContextToAppend: MultiContextEvaluationContext =
      kind === 'multi'
        ? (contextToAppend as MultiContextEvaluationContext)
        : { kind: 'multi', [kind]: rest };

    // Merge the formatted context to append to the global context, and set it in the OpenFeature client.
    this.context = deepMerge(this.context, formattedContextToAppend);
    OpenFeature.setContext(this.context);
    this.contextChanged$.next();
  }

  /**
   * Flag values the browser should render. Runtime overrides win over config overrides,
   * and both win over the provider snapshot, matching server-side evaluation.
   */
  private async getBrowserSnapshot(): Promise<Record<string, unknown>> {
    const flags = await this.initialFeatureFlagsGetter();
    return { ...flags, ...this.overrides$.value };
  }

  private registerRoutes(http: InternalHttpServiceSetup): void {
    const router = http.createRouter('');
    this.registerCounterRoute(router);
    registerOfrepRoutes(router, () => this.getBrowserSnapshot(), this.logger);
    registerOverrideRoutes(router, {
      getRepository: () => this.overridesRepository,
      getOverridesResponse: () => ({
        runtimeOverrides: this.runtimeOverrides$.value,
        configOverrides: this.configOverrides$.value,
        evaluatedFlags: [...this.evaluatedFlags.entries()].map(([key, flagValue]) => ({
          key,
          value: flagValue,
        })),
      }),
      commitRuntimeOverrides: (overrides) => this.commitRuntimeOverrides(overrides),
      logger: this.logger,
    });
  }

  private registerCounterRoute(router: IRouter): void {
    router.post(
      {
        path: '/internal/feature-flags/{flagName}/counter',
        validate: {
          params: schema.object({
            flagName: schema.string({ minLength: 1, maxLength: 255 }),
          }),
          body: schema.object({
            value: schema.oneOf([
              schema.boolean(),
              schema.number(),
              schema.string({ maxLength: 5000 }),
            ]),
          }),
        },
        security: {
          authz: {
            enabled: false,
            reason: 'Any authenticated user should have access to the configuration',
          },
          authc: {
            enabled: true,
          },
        },
        options: {
          access: 'internal',
        },
      },
      (context, request, response) => {
        const { flagName } = request.params;
        const { value } = request.body;
        incrementCounter(flagName, value);
        return response.accepted();
      }
    );
  }

  /** Runtime overrides replace config overrides for the same key. */
  private publishMergedOverrides(): void {
    this.overrides$.next({
      ...this.configOverrides$.value,
      ...this.runtimeOverrides$.value,
    });
  }

  /**
   * Applies a local write immediately. The write counter moves after the saved object
   * update so a poll that started earlier cannot put the stale document back.
   */
  private commitRuntimeOverrides(overrides: Record<string, FeatureFlagOverrideValue>): void {
    this.runtimeOverrides$.next(overrides);
    this.publishMergedOverrides();
    this.runtimeOverrideWriteCount++;
    // This write's saved-object version is not known here. A poll may already have
    // recorded a newer version, and keeping that version would skip it forever.
    this.latestOverrideVersion = undefined;
  }

  private pollRuntimeOverrides(repository: ISavedObjectsRepository): void {
    timer(0, RUNTIME_OVERRIDES_POLL_INTERVAL_MS)
      .pipe(
        switchMap(async () => {
          const writeCountAtRead = this.runtimeOverrideWriteCount;
          try {
            const persisted = await repository.get<FeatureFlagsOverridesAttributes>(
              FEATURE_FLAGS_OVERRIDES_SAVED_OBJECT_TYPE,
              FEATURE_FLAGS_OVERRIDES_SAVED_OBJECT_ID
            );
            if (this.stopped || writeCountAtRead !== this.runtimeOverrideWriteCount || !persisted) {
              return;
            }
            if (this.latestOverrideVersion === persisted.version) {
              return;
            }
            this.latestOverrideVersion = persisted.version;
            this.runtimeOverrides$.next(normalizeOverrides(persisted.attributes?.overrides));
            this.publishMergedOverrides();
          } catch (error) {
            if (error instanceof Error && SavedObjectsErrorHelpers.isNotFoundError(error)) {
              // The document is the source of truth. Absence means no runtime overrides,
              // including after one this node already applied. Skip when a local write
              // landed during this read, and when there was nothing to clear: most
              // deployments never create the document, and publishing every poll would
              // wake every flag subscriber.
              if (this.stopped || writeCountAtRead !== this.runtimeOverrideWriteCount) {
                return;
              }
              if (
                this.latestOverrideVersion === undefined &&
                Object.keys(this.runtimeOverrides$.value).length === 0
              ) {
                return;
              }
              this.latestOverrideVersion = undefined;
              this.runtimeOverrides$.next({});
              this.publishMergedOverrides();
              return;
            }
            const message = error instanceof Error ? error.message : String(error);
            this.logger.warn(`Failed to read persisted feature flag overrides: ${message}`);
          }
        }),
        takeUntil(this.stop$)
      )
      .subscribe();
  }

  /**
   * Waits for the context to be ready.
   * This is needed to avoid race conditions on early flag evaluations during startup.
   * @internal
   */
  private waitForContextReady(): Promise<void> {
    if (this.mustWaitForContextReady()) {
      // Wait until the context is ready but only if we haven't already waited for it before.
      this.waitForContextReadyPromise =
        this.waitForContextReadyPromise ??
        firstValueFrom(
          this.contextChanged$.pipe(
            // Re-check in case the context was "updated" without actually adding anything.
            filter(() => !this.mustWaitForContextReady()),
            // Wait for 200ms before timing out. `appendContext` is typically called with a debounce of 100ms.
            // If context is not available in double that time, we probably will not have any context.
            timeout({ first: 200, with: () => EMPTY })
          ),
          // Adding a default value to avoid the promise being rejected if the service stops before the context is ready.
          { defaultValue: undefined }
        );

      return this.waitForContextReadyPromise;
    }

    return Promise.resolve();
  }

  /**
   * Checks if we need to wait for the context to be ready.
   * @internal
   */
  private mustWaitForContextReady(): boolean {
    return (
      // There is a provider configured (we don't need to wait for the context if there is no provider to evaluate the flags)
      OpenFeature.providerMetadata !== NOOP_PROVIDER.metadata &&
      // And the context is still the plain { kind: 'multi' } (no context keys set yet)
      Object.keys(this.context).length === 1 &&
      this.context.kind === 'multi'
    );
  }
}
