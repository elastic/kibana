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
import { LegacyCoreSetup, LegacyCoreStart } from '../../../../core/public';
import { Plugin as DataPlugin } from '../../../../plugins/data/public';
import { Plugin as ExpressionsPlugin } from '../../../../plugins/expressions/public';
import {
  Setup as InspectorSetup,
  Start as InspectorStart,
} from '../../../../plugins/inspector/public';

export interface PluginsSetup {
  data: ReturnType<DataPlugin['setup']>;
  expressions: ReturnType<ExpressionsPlugin['setup']>;
  inspector: InspectorSetup;
}

export interface PluginsStart {
  data: ReturnType<DataPlugin['start']>;
  expressions: ReturnType<ExpressionsPlugin['start']>;
  inspector: InspectorStart;
}

export const npSetup = {
  core: (null as unknown) as LegacyCoreSetup,
  plugins: {} as PluginsSetup,
};

export const npStart = {
  core: (null as unknown) as LegacyCoreStart,
  plugins: {} as PluginsStart,
};

/**
 * Only used by unit tests
 * @internal
 */
export function __reset__() {
  npSetup.core = (null as unknown) as LegacyCoreSetup;
  npSetup.plugins = {} as any;
  npStart.core = (null as unknown) as LegacyCoreStart;
  npStart.plugins = {} as any;
}

export function __setup__(coreSetup: LegacyCoreSetup, plugins: PluginsSetup) {
  npSetup.core = coreSetup;
  npSetup.plugins = plugins;
}

export function __start__(coreStart: LegacyCoreStart, plugins: PluginsStart) {
  npStart.core = coreStart;
  npStart.plugins = plugins;
}
