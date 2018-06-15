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

import _ from 'lodash';
import { getActiveMappings } from './get_active_mappings';
import { MigrationPlugin } from './types';

export interface ComputeSupportedTypesOpts {
  kibanaVersion: string;
  plugins: MigrationPlugin[];
}

/**
 * computeSupportedTypes returns an array of types that are supported
 * by the specified plugins. These types may not be in the mappings,
 * as some types may have been renamed, and the mappings reflect only
 * the currently supported types, but migrations may exist that convert
 * types not in the mappings to types that *are* in the mappings, so
 * this returns all types (those in the mappings and any in the migrations).
 *
 * @param {ComputeSupportedTypesOpts} opts
 * @prop {string} kibanaVersion - The current Kibana version
 * @prop {MigrationPlugin[]} plugins - The plugins whose mappings and migrations
 *    are used to determine what types are supported.
 * @returns {string[]}
 */
export function computeSupportedTypes({
  plugins,
  kibanaVersion,
}: ComputeSupportedTypesOpts) {
  return _(plugins)
    .map(p => _.keys(p.migrations))
    .concat(
      _.keys(getActiveMappings({ kibanaVersion, plugins }).doc.properties)
    )
    .flatten()
    .unique()
    .value() as string[];
}
