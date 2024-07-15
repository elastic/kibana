/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { CoreContext } from '@kbn/core-base-browser-internal';
import type {
  EvaluationContext,
  FeatureFlagsSetup,
  FeatureFlagsStart,
} from '@kbn/core-feature-flags-browser';
import type { Logger } from '@kbn/logging';
import { apm } from '@elastic/apm-rum';
import { type Client, OpenFeature } from '@openfeature/web-sdk';

export class FeatureFlagsService {
  private readonly featureFlagsClient: Client;
  private readonly isServerless: boolean;
  private readonly logger: Logger;
  private isProviderReadyPromise?: Promise<void>;

  constructor(core: CoreContext) {
    this.logger = core.logger.get('feature-flags-service');
    this.isServerless = core.env.packageInfo.buildFlavor === 'serverless';
    this.featureFlagsClient = OpenFeature.getClient();
    OpenFeature.setLogger(this.logger.get('open-feature'));
  }

  /**
   * Setup lifecycle method
   */
  public setup(): FeatureFlagsSetup {
    return {
      setProvider: (provider) => {
        this.isProviderReadyPromise = OpenFeature.setProviderAndWait(provider);
      },
      setContext: (contextToAppend) => this.setContext(contextToAppend),
    };
  }

  /**
   * Start lifecycle method
   */
  public async start(): Promise<FeatureFlagsStart> {
    // Adding a timeout here to avoid hanging the start for too long if the provider is unresponsive
    await Promise.race([
      this.isProviderReadyPromise,
      await new Promise((resolve) => setTimeout(resolve, 2 * 1000)).then(() => {
        this.logger.warn('The feature flags provider took too long to initialize');
      }),
    ]);

    return {
      addHandler: this.featureFlagsClient.addHandler.bind(this.featureFlagsClient),
      setContext: (contextToAppend) => this.setContext(contextToAppend),
      getBooleanValue: (flagName: string, fallbackValue: boolean) => {
        // TODO: intercept with config overrides
        const value = this.featureFlagsClient.getBooleanValue(flagName, fallbackValue);
        apm.addLabels({ [`flag_${flagName}`]: value });
        // TODO: increment usage counter
        return value;
      },
      getStringValue: (flagName: string, fallbackValue: string) => {
        // TODO: intercept with config overrides
        const value = this.featureFlagsClient.getStringValue(flagName, fallbackValue);
        apm.addLabels({ [`flag_${flagName}`]: value });
        // TODO: increment usage counter
        return value;
      },
      getNumberValue: (flagName: string, fallbackValue: number) => {
        // TODO: intercept with config overrides
        const value = this.featureFlagsClient.getNumberValue(flagName, fallbackValue);
        apm.addLabels({ [`flag_${flagName}`]: value });
        // TODO: increment usage counter
        return value;
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
   * Formats the provided context to fulfill the expected multi-context structure.
   * @param contextToAppend The {@link EvaluationContext} to append.
   * @private
   */
  private async setContext(contextToAppend: EvaluationContext): Promise<void> {
    // If no kind provided, default to the project|deployment level.
    const { kind = this.isServerless ? 'project' : 'deployment', ...rest } = contextToAppend;
    // Format the context to fulfill the expected multi-context structure
    const context = kind !== 'multi' ? { kind: 'multi', [kind]: rest } : contextToAppend;
    await OpenFeature.setContext(context);
  }
}
