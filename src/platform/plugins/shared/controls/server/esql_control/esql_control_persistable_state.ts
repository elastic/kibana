/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  EmbeddableStateWithType,
  EmbeddablePersistableStateService,
} from '@kbn/embeddable-plugin/common';
import { SavedObjectReference } from '@kbn/core/types';

export const createEsqlControlInject = (): EmbeddablePersistableStateService['inject'] => {
  return (state: EmbeddableStateWithType, references: SavedObjectReference[]) => {
    const workingState = { ...state } as EmbeddableStateWithType;
    return workingState as EmbeddableStateWithType;
  };
};

export const createEsqlControlExtract = (): EmbeddablePersistableStateService['extract'] => {
  return (state: EmbeddableStateWithType) => {
    const workingState = { ...state } as EmbeddableStateWithType;
    const references: SavedObjectReference[] = [];

    return { state: workingState as EmbeddableStateWithType, references };
  };
};
