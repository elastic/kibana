/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export type { EmbeddableSetup, EmbeddableStart } from './types';
export type { EmbeddableStateWithType } from './bwc/persistable_state';
export type { EnhancementRegistryDefinition } from '../common/enhancements/types';

export const plugin = async () => {
  const { EmbeddableServerPlugin } = await import('./plugin');
  return new EmbeddableServerPlugin();
};
