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

import chalk from 'chalk';
import { getServeCommandOptions } from './commands';
import { KibanaFeatures } from './kibana_features';

export const usage = 'Usage: bin/kibana [options]';
export const description =
  'Kibana is an open source (Apache Licensed), browser-based analytics and search dashboard for Elasticsearch.';
export const docs = 'Documentation: https://elastic.co/kibana';

function snakeToCamel(s: string) {
  return s.replace(/(\-\w)/g, m => m[1].toUpperCase());
}

export const check = (options: { [key: string]: any }) => (argv: { [key: string]: any }) => {
  // make sure only allowed options are specified
  const yargsSpecialOptions = ['$0', '_', 'help', 'h', 'version', 'v'];
  const allowedOptions = Object.keys(options).reduce(
    (allowed, option) =>
      allowed
        .add(option)
        .add(snakeToCamel(option))
        .add(options[option].alias || option),
    new Set(yargsSpecialOptions)
  );
  const unrecognizedOptions = Object.keys(argv).filter(arg => !allowedOptions.has(arg));

  if (unrecognizedOptions.length) {
    throw new Error(
      `The following options were not recognized:\n` +
        `  ${chalk.bold(JSON.stringify(unrecognizedOptions))}`
    );
  }

  return true;
};

export function getUnknownOptions(argv: { [key: string]: any }, kibanaFeatures: KibanaFeatures) {
  const yargsSpecialOptions = ['$0', '_', 'help', 'h', 'version', 'v'];
  const allowedOptions = new Set(yargsSpecialOptions);

  for (const [name, value] of getServeCommandOptions(kibanaFeatures)) {
    allowedOptions.add(name).add(snakeToCamel(name));

    if (Array.isArray(value.alias)) {
      value.alias.forEach(alias => allowedOptions.add(alias));
    } else if (typeof value.alias === 'string') {
      allowedOptions.add(value.alias);
    }
  }

  return Object.keys(argv).filter(arg => !allowedOptions.has(arg));
}
