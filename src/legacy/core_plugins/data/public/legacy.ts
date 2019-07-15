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

import { npSetup } from 'ui/new_platform';
// @ts-ignore
import { renderersRegistry } from 'plugins/interpreter/registries';
// @ts-ignore
import { getInterpreter } from 'plugins/interpreter/interpreter';
import { LegacyDependenciesPlugin } from './shim/legacy_dependencies_plugin';
import { plugin } from '.';

const dataPlugin = plugin();
const legacyPlugin = new LegacyDependenciesPlugin();
export const setup = dataPlugin.setup(npSetup.core, {
  __LEGACY: legacyPlugin.setup(),
  interpreter: {
    renderersRegistry,
    getInterpreter,
  },
});
