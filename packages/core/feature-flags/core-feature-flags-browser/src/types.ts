/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { Provider } from '@openfeature/web-sdk';
import {
  ClientProviderEvents,
  type EvaluationContext as OpenFeatureEvaluationContext,
  type Eventing,
} from '@openfeature/core';

/**
 * The evaluation context to use when retrieving the flags.
 * @public
 */
export type EvaluationContext = OpenFeatureEvaluationContext & {
  /**
   * We use multi-context so that we can apply segmentation rules at different levels (organization/project/deployment).
   * Kind helps us specify which sub-context should receive the new attributes.
   * If no `kind` is provided, it defaults to `project`|`deployment`, depending on the offering (Serverless vs. Traditional).
   * @public
   *
   * @example
   * {
   *   kind: 'multi',
   *   organization: {
   *     key: 1234,
   *     in_trial: true,
   *   },
   *   project|deployment: {
   *     key: 12345567890,
   *     version: 8.15.0,
   *     buildHash: 'ffffffffaaaaaaaa',
   *   },
   * }
   *
   * @example
   * {
   *   kind: 'organization',
   *   key: 1234,
   *   in_trial: true,
   * }
   *
   * @example
   * {
   *   key: 12345567890,
   *   version: 8.15.0,
   *   buildHash: 'ffffffffaaaaaaaa',
   *   }
   * }
   */
  kind?: 'multi' | 'organization' | 'project' | 'deployment';
};

/**
 * Setup contract of the Feature Flags Service
 * @public
 */
export interface FeatureFlagsSetup {
  /**
   * Registers an OpenFeature provider to talk to the
   * 3rd-party service that manages the Feature Flags.
   * @param provider The {@link Provider | OpenFeature Provider} to handle the communication with the feature flags management system.
   * @public
   */
  setProvider(provider: Provider): void;

  /**
   * Appends new keys to the evaluation context.
   * @param contextToAppend The additional keys that should be appended/modified in the evaluation context.
   * @public
   */
  setContext(contextToAppend: EvaluationContext): Promise<void>;
}

/**
 * Setup contract of the Feature Flags Service
 * @public
 */
export interface FeatureFlagsStart {
  /**
   * Registers an {@link Eventing<ClientProviderEvents>['addHandler'] | event handler} to the specified event name.
   * Useful when the consumer needs to react to flag changes.
   * @public
   */
  addHandler: Eventing<ClientProviderEvents>['addHandler'];

  /**
   * Appends new keys to the evaluation context.
   * @param contextToAppend The additional keys that should be appended/modified in the evaluation context.
   * @public
   */
  setContext(contextToAppend: EvaluationContext): Promise<void>;

  /**
   * Evaluates a boolean flag
   * @public
   */
  getBooleanValue(flagName: string, fallbackValue: boolean): boolean;

  /**
   * Evaluates a string flag
   * @public
   */
  getStringValue(flagName: string, fallbackValue: string): string;

  /**
   * Evaluates a number flag
   * @public
   */
  getNumberValue(flagName: string, fallbackValue: number): number;
}
