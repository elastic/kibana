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

import { TypeOf, schema } from '@kbn/config-schema';

/**
 * The CSP options used for Kibana.
 * @public
 */
export interface CspOptions {
  /**
   * The CSP rules in a formatted directives string for use
   * in a `Content-Security-Policy` header.
   */
  directives: string;

  /**
   * The CSP rules used for Kibana.
   */
  rules: string[];

  /**
   * Specify whether browsers that do not support CSP should be
   * able to use Kibana. Use `true` to block and `false` to allow.
   */
  strict: boolean;

  /**
   * Specify whether users with legacy browsers should be warned
   * about their lack of Kibana security compliance.
   */
  warnLegacyBrowsers: boolean;
}

export type CspConfigType = TypeOf<typeof config.schema>;

const DEFAULT_RULES = [
  `script-src 'unsafe-eval' 'self'`,
  `worker-src blob: 'self'`,
  `style-src 'unsafe-inline' 'self'`,
];
const defaults = {
  directives: createCspDirectives(DEFAULT_RULES),
  rules: DEFAULT_RULES,
  strict: true,
  warnLegacyBrowsers: true,
};
export const config = {
  path: 'csp',
  schema: schema.object({
    rules: schema.arrayOf(schema.string(), { defaultValue: defaults.rules }),
    strict: schema.boolean({ defaultValue: defaults.strict }),
    warnLegacyBrowsers: schema.boolean({ defaultValue: defaults.warnLegacyBrowsers }),
  }),
};

/**
 * The default set of CSP options used for Kibana.
 * @public
 */
export const DEFAULT_CSP_OPTIONS: Readonly<CspOptions> = Object.freeze(defaults);

/**
 * Converts an array of rules into a formatted directives string for use
 * in a `Content-Security-Policy` header.
 * @internal
 */
export function createCspDirectives(rules: string[]) {
  return rules.join('; ');
}
