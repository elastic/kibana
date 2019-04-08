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

const LEVELS = ['silent', 'error', 'warning', 'info', 'debug', 'verbose'];

export function pickLevelFromFlags(flags, options = {}) {
  if (flags.verbose) return 'verbose';
  if (flags.debug) return 'debug';
  if (flags.quiet) return 'error';
  if (flags.silent) return 'silent';
  return options.default || 'info';
}

export function parseLogLevel(name) {
  const i = LEVELS.indexOf(name);

  if (i === -1) {
    const msg = `Invalid log level "${name}" ` + `(expected one of ${LEVELS.join(',')})`;
    throw new Error(msg);
  }

  const flags = {};
  LEVELS.forEach((level, levelI) => {
    flags[level] = levelI <= i;
  });

  return { name, flags };
}
