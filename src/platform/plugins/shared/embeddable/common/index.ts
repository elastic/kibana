/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Reference } from '@kbn/content-management-utils';
import type { SerializableRecord } from '@kbn/utility-types';

export type { EmbeddableTransforms } from './types';

export type {
  EmbeddableRegistryDefinition,
  EmbeddableStateWithType,
  EmbeddablePersistableStateService,
} from '../server';

export type TransformEnhancementsIn = (enhancementsState: SerializableRecord) => {
  state: SerializableRecord;
  references: Reference[];
};

export type TransformEnhancementsOut = (
  enhancementsState: SerializableRecord,
  references: Reference[]
) => SerializableRecord;
