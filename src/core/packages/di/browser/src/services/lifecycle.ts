/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  CoreSetup as CoreSetupContext,
  CoreStart as CoreStartContext,
} from '@kbn/core-lifecycle-browser';
import type { PluginInitializerContext } from '@kbn/core-plugins-browser';
import { toServiceIdentifier } from '@kbn/core-di-internal';

export const PluginInitializer = toServiceIdentifier<PluginInitializerContext>(
  'plugin',
  'initializer'
);
export const CoreSetup = toServiceIdentifier<CoreSetupContext>('core', 'setup');
export const CoreStart = toServiceIdentifier<CoreStartContext>('core', 'start');
