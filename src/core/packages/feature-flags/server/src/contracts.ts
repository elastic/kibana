/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Provider } from '@openfeature/server-sdk';
import { type EvaluationContext as OpenFeatureEvaluationContext } from '@openfeature/core';
import type { Observable } from 'rxjs';

/**
 * The evaluation context to use when retrieving the flags.
 *
 * We use multi-context so that we can apply segmentation rules at different levels (`organization`/`kibana`).
 * * `organization` includes any information that is common to all the projects/deployments in an organization. An example is the in_trial status.
 * * The `kibana` context includes all the information that identifies a project/deployment. Examples are version, offering, and has_data.
 * Kind helps us specify which sub-context should receive the new attributes.
 * If no `kind` is provided, it defaults to `kibana`.
 *
 * @example Providing properties for both contexts
 * {
 *   kind: 'multi',
 *   organization: {
 *     key: 1234,
 *     in_trial: true,
 *   },
 *   kibana: {
 *     key: 12345567890,
 *     version: 8.15.0,
 *     buildHash: 'ffffffffaaaaaaaa',
 *   },
 * }
 *
 * @example Appending context to the organization sub-context
 * {
 *   kind: 'organization',
 *   key: 1234,
 *   in_trial: true,
 * }
 *
 * @example Appending context to the `kibana` sub-context
 * {
 *   key: 12345567890,
 *   version: 8.15.0,
 *   buildHash: 'ffffffffaaaaaaaa',
 *   }
 * }
 *
 * @public
 */
export type EvaluationContext = MultiContextEvaluationContext | SingleContextEvaluationContext;

/**
 * Multi-context format. The sub-contexts are provided in their nested properties.
 * @public
 */
export type MultiContextEvaluationContext = OpenFeatureEvaluationContext & {
  /**
   * Static `multi` string
   */
  kind: 'multi';
  /**
   * The Elastic Cloud organization-specific context.
   */
  organization?: OpenFeatureEvaluationContext;
  /**
   * The deployment/project-specific context.
   */
  kibana?: OpenFeatureEvaluationContext;
};

/**
 * Single Context format. If `kind` is not specified, it applies to the `kibana` sub-context.
 */
export type SingleContextEvaluationContext = OpenFeatureEvaluationContext & {
  /**
   * The sub-context that it's updated. Defaults to `kibana`.
   */
  kind?: 'organization' | 'kibana';
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
  appendContext(contextToAppend: EvaluationContext): void;
}

/**
 * Setup contract of the Feature Flags Service
 * @public
 */
export interface FeatureFlagsStart {
  /**
   * Appends new keys to the evaluation context.
   * @param contextToAppend The additional keys that should be appended/modified in the evaluation context.
   * @public
   */
  appendContext(contextToAppend: EvaluationContext): void;

  /**
   * Evaluates a boolean flag
   * @param flagName The flag ID to evaluate
   * @param fallbackValue If the flag cannot be evaluated for whatever reason, the fallback value is provided.
   * @public
   */
  getBooleanValue(flagName: string, fallbackValue: boolean): Promise<boolean>;

  /**
   * Evaluates a string flag
   * @param flagName The flag ID to evaluate
   * @param fallbackValue If the flag cannot be evaluated for whatever reason, the fallback value is provided.
   * @public
   */
  getStringValue<Value extends string>(flagName: string, fallbackValue: Value): Promise<Value>;

  /**
   * Evaluates a number flag
   * @param flagName The flag ID to evaluate
   * @param fallbackValue If the flag cannot be evaluated for whatever reason, the fallback value is provided.
   * @public
   */
  getNumberValue<Value extends number>(flagName: string, fallbackValue: Value): Promise<Value>;

  /**
   * Returns an observable of a boolean flag
   * @param flagName The flag ID to evaluate
   * @param fallbackValue If the flag cannot be evaluated for whatever reason, the fallback value is provided.
   * @public
   */
  getBooleanValue$(flagName: string, fallbackValue: boolean): Observable<boolean>;

  /**
   * Returns an observable of a string flag
   * @param flagName The flag ID to evaluate
   * @param fallbackValue If the flag cannot be evaluated for whatever reason, the fallback value is provided.
   * @public
   */
  getStringValue$<Value extends string>(flagName: string, fallbackValue: Value): Observable<Value>;

  /**
   * Returns an observable of a number flag
   * @param flagName The flag ID to evaluate
   * @param fallbackValue If the flag cannot be evaluated for whatever reason, the fallback value is provided.
   * @public
   */
  getNumberValue$<Value extends number>(flagName: string, fallbackValue: Value): Observable<Value>;
}
