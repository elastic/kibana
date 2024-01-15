/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { PluginInitializerContext } from '@kbn/core/public';
import { AdvancedSettingsPlugin } from './plugin';
export type { AdvancedSettingsSetup, AdvancedSettingsStart } from './types';

/**
 * Exports the field component as a React.lazy component. We're explicitly naming it lazy here
 * so any plugin that would import that can clearly see it's lazy loaded and can only be used
 * inside a suspense context.
 */
const LazyField = React.lazy(() => import('./management_app/components/field'));
export { LazyField };

export { toEditableConfig } from './management_app/lib/to_editable_config';

export function plugin(initializerContext: PluginInitializerContext) {
  return new AdvancedSettingsPlugin();
}

export type { FieldState } from './management_app/types';
