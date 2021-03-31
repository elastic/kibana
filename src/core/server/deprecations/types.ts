/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { SavedObjectsClientContract } from '../saved_objects/types';
import type { IScopedClusterClient } from '../elasticsearch';

type MaybePromise<T> = T | Promise<T>;

export interface DomainDeprecationDetails extends DeprecationsDetails {
  domainId: string;
}

export interface DeprecationsDetails {
  /* The message to be displayed for the deprecation. */
  message: string;
  /**
   * levels:
   * - warning: will not break deployment upon upgrade
   * - critical: needs to be addressed before upgrade.
   * - fetch_error: Deprecations service failed to grab the deprecation details for the domain.
   */
  level: 'warning' | 'critical' | 'fetch_error';
  /* (optional) link to the documentation for more details on the deprecation. */
  documentationUrl?: string;
  /* corrective action needed to fix this deprecation. */
  correctiveActions: {
    /**
     * (optional) The api to be called to automatically fix the deprecation
     * Each domain should implement a POST/PUT route for their plugin to
     * handle their deprecations.
     */
    api?: {
      /* Kibana route path. Passing a query string is allowed */
      path: string;
      /* Kibana route method: 'POST' or 'PUT'. */
      method: 'POST' | 'PUT';
      /* Additional details to be passed to the route. */
      body?: {
        [key: string]: any;
      };
    };
    /**
     * (optional) If this deprecation cannot be automtically fixed
     * via an API corrective action. Specify a list of manual steps
     * users need to follow to fix the deprecation before upgrade.
     */
    manualSteps?: string[];
  };
}

export interface RegisterDeprecationsConfig {
  getDeprecations: (context: GetDeprecationsContext) => MaybePromise<DeprecationsDetails[]>;
}

export interface GetDeprecationsContext {
  esClient: IScopedClusterClient;
  savedObjectsClient: SavedObjectsClientContract;
}

export interface DeprecationsGetResponse {
  deprecations: DomainDeprecationDetails[];
}
