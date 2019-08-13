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

import { Observable } from 'rxjs';
import { toArray, flatMap } from 'rxjs/operators';
// @ts-ignore
import { findPluginSpecs } from '../../../../legacy/plugin_discovery/find_plugin_specs.js';
// @ts-ignore
import { Config } from './../../../../src/legacy/server/config/config';
// @ts-ignore
import { transformDeprecations } from '../../../../../src/legacy/server/config/transform_deprecations.js';

export function findLegacyPluginSpec$(setting$: Observable<any>) {
  return setting$.pipe(
    flatMap(settings => {
      const config = Config.withDefaultSchema(transformDeprecations(settings));
      const { spec$ }: { spec$: Observable<unknown> } = findPluginSpecs(settings, config) as any;

      return spec$;
    }),
    toArray()
  );
}
