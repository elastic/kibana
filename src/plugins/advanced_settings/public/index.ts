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

import React from 'react';
import { PluginInitializerContext } from 'kibana/public';
import { AdvancedSettingsPlugin } from './plugin';
export { AdvancedSettingsSetup, AdvancedSettingsStart } from './types';
export { ComponentRegistry } from './component_registry';

/**
 * Exports the field component as a React.lazy component. We're explicitly naming it lazy here
 * so any plugin that would import that can clearly see it's lazy loaded and can only be used
 * inside a suspense context.
 */
const LazyField = React.lazy(() => import('./management_app/components/field'));
export { LazyField };

export function plugin(initializerContext: PluginInitializerContext) {
  return new AdvancedSettingsPlugin();
}
