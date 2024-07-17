/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { CoreContext } from '@kbn/core-base-server-internal';
import type {
  EvaluationContext,
  FeatureFlagsSetup,
  FeatureFlagsStart,
} from '@kbn/core-feature-flags-server';
import type { Logger } from '@kbn/logging';
import apm from 'elastic-apm-node';
import { type Client, OpenFeature } from '@openfeature/server-sdk';
import deepMerge from 'deepmerge';

export class FeatureFlagsService {
  private readonly featureFlagsClient: Client;
  private readonly logger: Logger;
  private context: EvaluationContext = { kind: 'multi' };

  constructor(core: CoreContext) {
    this.logger = core.logger.get('feature-flags-service');
    this.featureFlagsClient = OpenFeature.getClient();
    OpenFeature.setLogger(this.logger.get('open-feature'));
  }

  /**
   * Setup lifecycle method
   */
  public setup(): FeatureFlagsSetup {
    return {
      setProvider: (provider) => {
        OpenFeature.setProvider(provider);
      },
      appendContext: (contextToAppend) => this.appendContext(contextToAppend),
    };
  }

  /**
   * Start lifecycle method
   */
  public start(): FeatureFlagsStart {
    return {
      addHandler: this.featureFlagsClient.addHandler.bind(this.featureFlagsClient),
      appendContext: (contextToAppend) => this.appendContext(contextToAppend),
      getBooleanValue: async (flagName: string, fallbackValue: boolean) => {
        // TODO: intercept with config overrides
        const value = await this.featureFlagsClient.getBooleanValue(flagName, fallbackValue);
        apm.addLabels({ [`flag_${flagName}`]: value });
        // TODO: increment usage counter
        return value;
      },
      getStringValue: async (flagName: string, fallbackValue: string) => {
        // TODO: intercept with config overrides
        const value = await this.featureFlagsClient.getStringValue(flagName, fallbackValue);
        apm.addLabels({ [`flag_${flagName}`]: value });
        // TODO: increment usage counter
        return value;
      },
      getNumberValue: async (flagName: string, fallbackValue: number) => {
        // TODO: intercept with config overrides
        const value = await this.featureFlagsClient.getNumberValue(flagName, fallbackValue);
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
  private appendContext(contextToAppend: EvaluationContext): void {
    // If no kind provided, default to the project|deployment level.
    const { kind = 'kibana', ...rest } = contextToAppend;
    // Format the context to fulfill the expected multi-context structure
    const formattedContextToAppend: EvaluationContext =
      kind !== 'multi' ? { kind: 'multi', [kind]: rest } : contextToAppend;

    // Merge the formatted context to append to the global context, and set it in the OpenFeature client.
    this.context = deepMerge(this.context, formattedContextToAppend);
    OpenFeature.setContext(this.context);
  }
}
