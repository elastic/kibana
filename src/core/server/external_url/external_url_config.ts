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

import { config } from './config';

const DEFAULT_CONFIG = Object.freeze(config.schema.validate({}));

/**
 * External Url configuration for use in Kibana.
 * @public
 */
export interface IExternalUrlConfig {
  /**
   * A set of policies describing which external urls are allowed.
   */
  readonly policy: IExternalUrlPolicy[];
}

/**
 * A policy describing whether access to an external destination is allowed.
 * @public
 */
export interface IExternalUrlPolicy {
  /**
   * Indicates of this policy allows or denies access to the described destination.
   */
  allow: boolean;

  /**
   * Optional host describing the external destination.
   * May be combined with `protocol`. Required if `protocol` is not defined.
   *
   * @example
   * ```ts
   * // allows access to all of google.com, using any protocol.
   * allow: true,
   * host: 'google.com'
   * ```
   */
  host?: string;

  /**
   * Optional protocol describing the external destination.
   * May be combined with `host`. Required if `host` is not defined.
   *
   * @example
   * ```ts
   * // allows access to all destinations over the `https` protocol.
   * allow: true,
   * protocol: 'https'
   * ```
   */
  protocol?: string;
}

/**
 * External Url configuration for use in Kibana.
 * @public
 */
export class ExternalUrlConfig implements IExternalUrlConfig {
  static readonly DEFAULT = new ExternalUrlConfig();

  public readonly policy: IExternalUrlPolicy[];

  /**
   * Returns the default External Url configuration when passed with no config
   * @internal
   */
  constructor(rawConfig: Partial<IExternalUrlConfig> = {}) {
    const source = { ...DEFAULT_CONFIG, ...rawConfig };

    this.policy = (source.policy as unknown) as IExternalUrlPolicy[];
  }
}
