/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * HTTP request ELU monitor config
 * @public
 */
export interface IHttpEluMonitorConfig {
  /**
   * Whether the monitoring of event loop utilization for HTTP requests is enabled.
   */
  readonly enabled: boolean;

  readonly logging: {
    /**
     * Whether to log ELU + ELA violations. Both `.elu` and `.ela` need to be exceeded for it to be considered a violation.
     */
    readonly enabled: boolean;

    readonly threshold: {
      /**
       * The minimum percentage of the request duration that needs to be exceeded (needs to be between 0 and 1)
       */
      readonly elu: number;
      /**
       * The minimum number of milliseconds the event loop was active for the duration of the request.
       */
      readonly ela: number;
    };
  };
}
