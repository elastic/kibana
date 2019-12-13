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

/**
 * New Platform Shim
 *
 * In this file, we import any legacy dependencies we have, and shim them into
 * our plugin by manually constructing the values that the new platform will
 * eventually be passing to the `setup/start` method of our plugin definition.
 *
 * The idea is that our `plugin.ts` can stay "pure" and not contain any legacy
 * world code. Then when it comes time to migrate to the new platform, we can
 * simply delete this shim file.
 *
 * We are also calling `setup/start` here and exporting our public contract so that
 * other legacy plugins are able to import from '../core_plugins/visualizations/legacy'
 * and receive the response value of the `setup/start` contract, mimicking the
 * data that will eventually be injected by the new platform.
 */

import { PluginInitializerContext } from 'src/core/public';
import { npSetup, npStart } from 'ui/new_platform';

import { plugin } from '.';

const pluginInstance = plugin({} as PluginInitializerContext);

export const setup = pluginInstance.setup(npSetup.core, {});
export const start = pluginInstance.start(npStart.core, {});
