/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export interface DeprecationDetailsMessage {
  type: 'markdown' | 'text';
  content: string;
}

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
  message: string | DeprecationDetailsMessage | Array<string | DeprecationDetailsMessage>;
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
  deprecationType?: 'config' | 'api' | 'feature';
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
    /**
     * (optional) The api to be called to mark the deprecation as resolved
     * This corrective action when called should not resolve the deprecation
     * instead it helps users track manually deprecated apis
     * If the API used does resolve the deprecation use `correctiveActions.api`
     */
    mark_as_resolved_api?: {
      apiTotalCalls: number;
      totalMarkedAsResolved: number;
      timestamp: Date | number | string;
      routePath: string;
      routeMethod: string;
      routeVersion?: string;
    };
  };
}

/**
 * @public
 */
export interface ApiDeprecationDetails extends BaseDeprecationDetails {
  apiId: string;
  deprecationType: 'api';
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
export type DeprecationsDetails =
  | ConfigDeprecationDetails
  | ApiDeprecationDetails
  | FeatureDeprecationDetails;

/**
 * @public
 */
export type DomainDeprecationDetails<ExtendedDetails = DeprecationsDetails> = ExtendedDetails & {
  domainId: string;
};

/**
 * @public
 */
export interface DeprecationsGetResponse {
  deprecations: DomainDeprecationDetails[];
}
