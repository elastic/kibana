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

import { isEqual } from 'lodash';

/**
 * Test whether a given config value is configured based on it's schema type.
 * Our configuration schema and code often accept and ignore empty values like
 * `elasticsearch.customHeaders: {}`. However, for telemetry purposes, we're
 * only interested when these values have been set to something that will
 * change the behaviour of Kibana.
 */
export const isConfigured = {
  /**
   * config is a string with non-zero length
   */
  string: (config?: string): boolean => {
    return (config?.trim?.()?.length ?? 0) > 0;
  },
  /**
   * config is an array with non-zero length
   */
  array: (config?: unknown[] | string, defaultValue?: any): boolean => {
    return Array.isArray(config)
      ? (config?.length ?? 0) > 0 && !isEqual(config, defaultValue)
      : false;
  },
  /**
   * config is a string or array of strings where each element has non-zero length
   */
  stringOrArray: (config?: string[] | string, defaultValue?: any): boolean => {
    return Array.isArray(config)
      ? isConfigured.array(config, defaultValue)
      : isConfigured.string(config);
  },
  /**
   * config is a record with at least one key
   */
  record: (config?: Record<string, unknown>): boolean => {
    return config != null && typeof config === 'object' && Object.keys(config).length > 0;
  },
  /**
   * config is a number
   */
  number: (config?: number): boolean => {
    // kbn-config-schema already does NaN validation, but doesn't hurt to be sure
    return typeof config === 'number' && !isNaN(config);
  },
};
