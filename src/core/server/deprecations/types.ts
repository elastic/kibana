/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { MaybePromise } from '@kbn/utility-types';
import type { SavedObjectsClientContract } from '../saved_objects/types';
import type { IScopedClusterClient } from '../elasticsearch';

/**
 * Base properties shared by all types of deprecations
 *
 * @public
 */
export interface BaseDeprecationDetails {
  /**
   * The title of the deprecation.
   * Check the README for writing deprecations in `src/core/server/deprecations/README.mdx`
   */
  title: string;
  /**
   * The description message to be displayed for the deprecation.
   * Check the README for writing deprecations in `src/core/server/deprecations/README.mdx`
   */
  message: string;
  /**
   * levels:
   * - warning: will not break deployment upon upgrade
   * - critical: needs to be addressed before upgrade.
   * - fetch_error: Deprecations service failed to grab the deprecation details for the domain.
   */
  level: 'warning' | 'critical' | 'fetch_error';
  /**
   * (optional) Used to identify between different deprecation types.
   * Example use case: in Upgrade Assistant, we may want to allow the user to sort by
   * deprecation type or show each type in a separate tab.
   *
   * Feel free to add new types if necessary.
   * Predefined types are necessary to reduce having similar definitions with different keywords
   * across kibana deprecations.
   */
  deprecationType?: 'config' | 'feature';
  /** (optional) link to the documentation for more details on the deprecation. */
  documentationUrl?: string;
  /** (optional) specify the fix for this deprecation requires a full kibana restart. */
  requireRestart?: boolean;
  /** corrective action needed to fix this deprecation. */
  correctiveActions: {
    /**
     * (optional) The api to be called to automatically fix the deprecation
     * Each domain should implement a POST/PUT route for their plugin to
     * handle their deprecations.
     */
    api?: {
      /** Kibana route path. Passing a query string is allowed */
      path: string;
      /** Kibana route method: 'POST' or 'PUT'. */
      method: 'POST' | 'PUT';
      /** Additional details to be passed to the route. */
      body?: {
        [key: string]: any;
      };
      /* Allow to omit context in the request of the body */
      omitContextFromBody?: boolean;
    };
    /**
     * Specify a list of manual steps users need to follow to
     * fix the deprecation before upgrade. Required even if an API
     * corrective action is set in case the API fails.
     * Check the README for writing deprecations in `src/core/server/deprecations/README.mdx`
     */
    manualSteps: string[];
  };
}

/**
 * @public
 */
export interface ConfigDeprecationDetails extends BaseDeprecationDetails {
  configPath: string;
  deprecationType: 'config';
}

/**
 * @public
 */
export interface FeatureDeprecationDetails extends BaseDeprecationDetails {
  deprecationType?: 'feature' | undefined;
}

/**
 * @public
 */
export type DeprecationsDetails = ConfigDeprecationDetails | FeatureDeprecationDetails;

/**
 * @internal
 */
export type DomainDeprecationDetails = DeprecationsDetails & {
  domainId: string;
};

/**
 * @public
 */
export interface RegisterDeprecationsConfig {
  getDeprecations: (context: GetDeprecationsContext) => MaybePromise<DeprecationsDetails[]>;
}

/**
 * @public
 */
export interface GetDeprecationsContext {
  esClient: IScopedClusterClient;
  savedObjectsClient: SavedObjectsClientContract;
}

/**
 * @public
 */
export interface DeprecationsGetResponse {
  deprecations: DomainDeprecationDetails[];
}
