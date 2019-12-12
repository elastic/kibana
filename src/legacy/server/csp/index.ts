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

export const DEFAULT_CSP_RULES = Object.freeze([
  `script-src 'unsafe-eval' 'self'`,
  `worker-src blob: 'self'`,
  `style-src 'unsafe-inline' 'self'`,
]);

export const DEFAULT_CSP_STRICT = true;

export const DEFAULT_CSP_WARN_LEGACY_BROWSERS = true;

export function createCSPRuleString(rules: string[]) {
  return rules.join('; ');
}
