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

import { CspConfigType, config } from './config';

const DEFAULT = Object.freeze(config.schema.validate({}));

/**
 * CSP configuration for use in Kibana.
 * @public
 */
export class CspConfig {
  /**
   * The CSP rules used for Kibana.
   */
  public rules: string[];

  /**
   * Specify whether browsers that do not support CSP should be
   * able to use Kibana. Use `true` to block and `false` to allow.
   */
  public strict: boolean;

  /**
   * Specify whether users with legacy browsers should be warned
   * about their lack of Kibana security compliance.
   */
  public warnLegacyBrowsers: boolean;

  /**
   * The CSP rules in a formatted directives string for use
   * in a `Content-Security-Policy` header.
   */
  public header!: string;

  /**
   * Returns the default CSP configuration when passed with no config
   */
  constructor(rawCspConfig: Partial<CspConfigType> = {}) {
    const source = { ...DEFAULT, ...rawCspConfig };

    this.rules = source.rules;
    this.strict = source.strict;
    this.warnLegacyBrowsers = source.warnLegacyBrowsers;
    Object.defineProperty(this, 'header', {
      enumerable: true,
      get: () => this.rules.join('; '),
    });
  }
}
