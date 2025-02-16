/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SavedObjectReference } from '@kbn/core/server';
import { EmbeddableStateWithType, EmbeddableStateWithTypeAndSavedObjectId } from '../types';

const stateHasSavedObjectId = (
  state: EmbeddableStateWithType
): state is EmbeddableStateWithTypeAndSavedObjectId => {
  return Boolean((state as EmbeddableStateWithTypeAndSavedObjectId).savedObjectId);
};

const panelSignifier = 'panel_';

export const injectSavedObjectIdRef = (
  state: EmbeddableStateWithType,
  references: SavedObjectReference[]
): EmbeddableStateWithType => {
  const savedObjectReference = references.find(
    (reference) => reference.name.indexOf(`${panelSignifier}${state.id}`) === 0
  );
  if (!savedObjectReference) {
    return state;
  }

  const nextState: EmbeddableStateWithTypeAndSavedObjectId = {
    ...state,
    savedObjectId: savedObjectReference.id,
  };
  return nextState;
};

export const extractSavedObjectIdRef = (
  state: EmbeddableStateWithType,
  references: SavedObjectReference[]
): { state: EmbeddableStateWithType; references: SavedObjectReference[] } => {
  if (!stateHasSavedObjectId(state) || !state.savedObjectId) return { state, references };
  references.push({
    name: `${panelSignifier}${state.id}`,
    type: state.type,
    id: state.savedObjectId,
  });

  delete state.savedObjectId;
  return { state, references };
};
