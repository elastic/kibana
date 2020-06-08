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

import { __reset__, __setup__, __start__, PluginsSetup, PluginsStart } from './new_platform';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import * as dataServices from '../../../../plugins/data/public/services';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import * as visualizationsServices from '../../../../plugins/visualizations/public/services';
import { LegacyCoreSetup, LegacyCoreStart } from '../../../../core/public';
import { coreMock } from '../../../../core/public/mocks';
import { npSetup, npStart } from './__mocks__';

describe('ui/new_platform', () => {
  describe('set service getters', () => {
    const testServiceGetters = (name: string, services: Record<string, Function>) => {
      const getters = Object.keys(services).filter((k) => k.substring(0, 3) === 'get');
      getters.forEach((g) => {
        it(`ui/new_platform sets a value for ${name} getter ${g}`, () => {
          __reset__();
          __setup__(
            (coreMock.createSetup() as unknown) as LegacyCoreSetup,
            (npSetup.plugins as unknown) as PluginsSetup
          );
          __start__(
            (coreMock.createStart() as unknown) as LegacyCoreStart,
            (npStart.plugins as unknown) as PluginsStart
          );

          expect(services[g]()).toBeDefined();
        });
      });
    };

    testServiceGetters('data', dataServices);
    testServiceGetters('visualizations', visualizationsServices);
  });
});
