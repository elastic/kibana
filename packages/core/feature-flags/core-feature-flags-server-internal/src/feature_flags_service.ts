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
import apm from 'elastic-apm-node';
import {
  type Client,
  OpenFeature,
  ServerProviderEvents,
  NOOP_PROVIDER,
} from '@openfeature/server-sdk';
import deepMerge from 'deepmerge';
import { filter, switchMap, startWith, Subject } from 'rxjs';
import { type FeatureFlagsConfig, featureFlagsConfig } from './feature_flags_config';

/**
 * Core-internal contract for the setup lifecycle step.
 * @private
 */
export interface InternalFeatureFlagsSetup extends FeatureFlagsSetup {
  /**
   * Used by the rendering service to share the overrides with the service on the browser side.
   */
  getOverrides: () => Record<string, unknown>;
}

/**
 * The server-side Feature Flags Service
 * @private
 */
export class FeatureFlagsService {
  private readonly featureFlagsClient: Client;
  private readonly logger: Logger;
  private overrides: Record<string, unknown> = {};
  private context: MultiContextEvaluationContext = { kind: 'multi' };

  /**
   * The core service's constructor
   * @param core {@link CoreContext}
   */
  constructor(private readonly core: CoreContext) {
    this.logger = core.logger.get('feature-flags-service');
    this.featureFlagsClient = OpenFeature.getClient();
    OpenFeature.setLogger(this.logger.get('open-feature'));
  }

  /**
   * Setup lifecycle method
   */
  public setup(): InternalFeatureFlagsSetup {
    // Register "overrides" to be changed via the dynamic config endpoint (enabled in test environments only)
    this.core.configService.addDynamicConfigPaths(featureFlagsConfig.path, ['overrides']);

    this.core.configService
      .atPath<FeatureFlagsConfig>(featureFlagsConfig.path)
      .subscribe(({ overrides = {} }) => {
        this.overrides = overrides;
      });

    return {
      getOverrides: () => this.overrides,
      setProvider: (provider) => {
        if (OpenFeature.providerMetadata !== NOOP_PROVIDER.metadata) {
          throw new Error('A provider has already been set. This API cannot be called twice.');
        }
        OpenFeature.setProvider(provider);
      },
      appendContext: (contextToAppend) => this.appendContext(contextToAppend),
    };
  }

  /**
   * Start lifecycle method
   */
  public start(): FeatureFlagsStart {
    const featureFlagsChanged$ = new Subject<string[]>();
    this.featureFlagsClient.addHandler(ServerProviderEvents.ConfigurationChanged, (event) => {
      if (event?.flagsChanged) {
        featureFlagsChanged$.next(event.flagsChanged);
      }
    });
    const observeFeatureFlag$ = (flagName: string) =>
      featureFlagsChanged$.pipe(
        filter((flagNames) => flagNames.includes(flagName)),
        startWith([flagName]) // only to emit on the first call
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
    await OpenFeature.close();
  }

  /**
   * Wrapper to evaluate flags with the common config overrides interceptions + APM and counters reporting
   * @param evaluationFn The actual evaluation API
   * @param flagName The name of the flag to evaluate
   * @param fallbackValue The fallback value
   * @private
   */
  private async evaluateFlag<T extends string | boolean | number>(
    evaluationFn: (flagName: string, fallbackValue: T) => Promise<T>,
    flagName: string,
    fallbackValue: T
  ): Promise<T> {
    const value =
      typeof this.overrides[flagName] !== 'undefined'
        ? (this.overrides[flagName] as T)
        : // We have to bind the evaluation or the client will lose its internal context
          await evaluationFn.bind(this.featureFlagsClient)(flagName, fallbackValue);
    apm.addLabels({ [`flag_${flagName}`]: value });
    // TODO: increment usage counter
    return value;
  }

  /**
   * Formats the provided context to fulfill the expected multi-context structure.
   * @param contextToAppend The {@link EvaluationContext} to append.
   * @private
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
  }
}
