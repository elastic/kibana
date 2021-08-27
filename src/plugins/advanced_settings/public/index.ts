/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import type { PluginInitializerContext } from '../../../core/public/plugins/plugin_context';
import { AdvancedSettingsPlugin } from './plugin';

export { ComponentRegistry } from './component_registry';
export { AdvancedSettingsSetup, AdvancedSettingsStart } from './types';
export { LazyField };

/**
 * Exports the field component as a React.lazy component. We're explicitly naming it lazy here
 * so any plugin that would import that can clearly see it's lazy loaded and can only be used
 * inside a suspense context.
 */
const LazyField = React.lazy(() => import('./management_app/components/field'));

export function plugin(initializerContext: PluginInitializerContext) {
  return new AdvancedSettingsPlugin();
}
