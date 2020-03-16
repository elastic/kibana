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

/**
 * The current status of a service at a point in time.
 *
 * @typeParam Meta - JSON-serializable object. Plugins should export this type to allow other plugins to read the `meta`
 *                   field in a type-safe way.
 * @public
 */
export type ServiceStatus<Meta extends Record<string, any> | unknown = unknown> =
  | {
      /**
       * The current availability level of the service.
       */
      level: ServiceStatusLevel.available;
      /**
       * A high-level summary of the service status.
       */
      summary?: string;
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
  | {
      level: ServiceStatusLevel;
      summary: string; // required when level !== available
      detail?: string;
      documentationUrl?: string;
      meta?: Meta;
    };

/**
 * The current "level" of availability of a service.
 * @public
 */
export enum ServiceStatusLevel {
  /**
   * Everything is working!
   */
  available,
  /**
   * Some features may not be working.
   */
  degraded,
  /**
   * The service is unavailable, but other functions that do not depend on this service should work.
   */
  unavailable,
  /**
   * Block all user functions and display the status page, reserved for Core services only.
   * Note: In the real implementation, this will be split out to a different type. Kept as a single type here to make
   * the RFC easier to follow.
   */
  critical,
}

/**
 * Status of core services. Only contains entries for backend services that could have a non-available `status`.
 * For example, `context` cannot possibly be broken, so it is not included.
 *
 * @public
 */
export interface CoreStatus {
  elasticsearch: ServiceStatus;
  savedObjects: ServiceStatus;
  // TODO
  // http: ServiceStatus;
  // uiSettings: ServiceStatus;
  // metrics: ServiceStatus;

  // Allows CoreStatus to be used as a Record in utility functions/
  [serviceName: string]: ServiceStatus;
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
}

/** @internal */
export interface InternalStatusServiceSetup {
  /**
   * Current status for all Core services.
   */
  core$: Observable<CoreStatus>;

  /**
   * Overall system status used for HTTP API
   */
  overall$: Observable<ServiceStatus>;
}
