/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { Observable } from 'rxjs';
import { deepFreeze } from '../../utils';

/**
 * The current status of a service at a point in time.
 *
 * @typeParam Meta - JSON-serializable object. Plugins should export this type to allow other plugins to read the `meta`
 *                   field in a type-safe way.
 * @public
 */
export interface ServiceStatus<Meta extends Record<string, any> | unknown = unknown> {
  /**
   * The current availability level of the service.
   */
  level: ServiceStatusLevel;
  /**
   * A high-level summary of the service status.
   */
  summary: string;
  /**
   * A more detailed description of the service status.
   */
  detail?: string;
  /**
   * A URL to open in a new tab about how to resolve or troubleshoot the problem.
   */
  documentationUrl?: string;
  /**
   * Any JSON-serializable data to be included in the HTTP API response. Useful for providing more fine-grained,
   * machine-readable information about the service status. May include status information for underlying features.
   */
  meta?: Meta;
}

/**
 * The current "level" of availability of a service.
 *
 * @remarks
 * The values implement `valueOf` to allow for easy comparisons between status levels with <, >, etc. Higher values
 * represent higher severities. Note that the default `Array.prototype.sort` implementation does not correctly sort
 * these values.
 *
 * A snapshot serializer is available in `src/core/server/test_utils` to ease testing of these values with Jest.
 *
 * @public
 */
export const ServiceStatusLevels = deepFreeze({
  /**
   * Everything is working!
   */
  available: {
    toString: () => 'available',
    valueOf: () => 0,
  },
  /**
   * Some features may not be working.
   */
  degraded: {
    toString: () => 'degraded',
    valueOf: () => 1,
  },
  /**
   * The service is unavailable, but other functions that do not depend on this service should work.
   */
  unavailable: {
    toString: () => 'unavailable',
    valueOf: () => 2,
  },
  /**
   * Block all user functions and display the status page, reserved for Core services only.
   */
  critical: {
    toString: () => 'critical',
    valueOf: () => 3,
  },
});

/**
 * A convenience type that represents the union of each value in {@link ServiceStatusLevels}.
 * @public
 */
export type ServiceStatusLevel = typeof ServiceStatusLevels[keyof typeof ServiceStatusLevels];

/**
 * Status of core services.
 *
 * @internalRemarks
 * Only contains entries for backend services that could have a non-available `status`.
 * For example, `context` cannot possibly be broken, so it is not included.
 *
 * @public
 */
export interface CoreStatus {
  elasticsearch: ServiceStatus;
  savedObjects: ServiceStatus;
}

/**
 * API for accessing status of Core and this plugin's dependencies as well as for customizing this plugin's status.
 * @public
 */
export interface StatusServiceSetup {
  /**
   * Current status for all Core services.
   */
  core$: Observable<CoreStatus>;

  /**
   * Overall system status for all of Kibana.
   *
   * @remarks
   * The level of the overall status will reflect the most severe status of any core service or plugin.
   *
   * Exposed only for reporting purposes to outside systems and should not be used by plugins. Instead, plugins should
   * only depend on the statuses of {@link StatusServiceSetup.core$ | Core} or their dependencies.
   */
  overall$: Observable<ServiceStatus>;
}

/** @internal */
export interface InternalStatusServiceSetup extends StatusServiceSetup {
  isStatusPageAnonymous: () => boolean;
}
