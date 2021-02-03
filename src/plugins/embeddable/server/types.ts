/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import {
  PersistableState,
  PersistableStateDefinition,
  SerializableState,
} from '../../kibana_utils/common';
import { EmbeddableStateWithType } from '../common/types';

export type EmbeddableFactoryRegistry = Map<string, EmbeddableRegistryItem>;
export type EnhancementsRegistry = Map<string, EnhancementRegistryItem>;

export interface EnhancementRegistryDefinition<P extends SerializableState = SerializableState>
  extends PersistableStateDefinition<P> {
  id: string;
}

export interface EnhancementRegistryItem<P extends SerializableState = SerializableState>
  extends PersistableState<P> {
  id: string;
}

export interface EmbeddableRegistryDefinition<
  P extends EmbeddableStateWithType = EmbeddableStateWithType
> extends PersistableStateDefinition<P> {
  id: string;
}

export interface EmbeddableRegistryItem<P extends EmbeddableStateWithType = EmbeddableStateWithType>
  extends PersistableState<P> {
  id: string;
}
