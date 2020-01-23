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
import { Env } from '../config';

const DEFAULT_CONFIG = Object.freeze(config.schema.validate({}));

/**
 * CSP configuration for use in Kibana.
 * @public
 */
export interface ICspConfig {
  /**
   * The CSP rules used for Kibana.
   */
  readonly rules: string[];

  /**
   * Specify whether browsers that do not support CSP should be
   * able to use Kibana. Use `true` to block and `false` to allow.
   */
  readonly strict: boolean;

  /**
   * Specify whether users with legacy browsers should be warned
   * about their lack of Kibana security compliance.
   */
  readonly warnLegacyBrowsers: boolean;

  /**
   * The CSP rules in a formatted directives string for use
   * in a `Content-Security-Policy` header.
   */
  readonly header: string;

  /**
   * Flag indicating that the configuraion changes the csp
   * rules from the defaults
   */
  readonly rulesChangedFromDefault: boolean;
}

/**
 * CSP configuration for use in Kibana.
 * @public
 */
export class CspConfig implements ICspConfig {
  public readonly rules: string[];
  public readonly strict: boolean;
  public readonly warnLegacyBrowsers: boolean;
  public readonly header: string;
  public readonly rulesChangedFromDefault: boolean;

  /**
   * Returns the default CSP configuration when passed with no config
   * @internal
   */
  constructor(env: Env, rawCspConfig?: Partial<Omit<ICspConfig, 'header'>>) {
    const source = { ...DEFAULT_CONFIG, ...rawCspConfig };

    this.rules = source.rules.map(rule => {
      // if we receive an env, and it indicates that this isn't a distributable, add `blob:` to the style csp rules
      if (env && !env.packageInfo.dist && rule.startsWith('style-src ')) {
        return rule.replace(/^style-src /, 'style-src blob: ');
      }

      return rule;
    });
    this.strict = source.strict;
    this.warnLegacyBrowsers = source.warnLegacyBrowsers;
    this.header = this.rules.join('; ');

    // only check to see if the csp values are customized when `rawCspConfig` was received.
    if (!rawCspConfig) {
      this.rulesChangedFromDefault = false;
    } else {
      const defaultCsp = new CspConfig(env);
      this.rulesChangedFromDefault = defaultCsp.header !== this.header;
    }
  }
}
