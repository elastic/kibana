/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { WithAllKeys } from '../../state_manager';
import { initializeStateManager } from '../../state_manager/state_manager';
import { StateComparators, StateManager } from '../../state_manager/types';
import { PublishesWritableDescription } from './publishes_description';
import { PublishesWritableTitle } from './publishes_title';

export interface SerializedTitles {
  title?: string;
  description?: string;
  hideTitle?: boolean;
}

const defaultTitlesState: WithAllKeys<SerializedTitles> = {
  title: undefined,
  description: undefined,
  hideTitle: undefined,
};

export const titleComparators: StateComparators<SerializedTitles> = {
  title: 'referenceEquality',
  description: 'referenceEquality',
  hideTitle: (a, b) => Boolean(a) === Boolean(b),
};

export const stateHasTitles = (state: unknown): state is SerializedTitles => {
  return (
    (state as SerializedTitles)?.title !== undefined ||
    (state as SerializedTitles)?.description !== undefined ||
    (state as SerializedTitles)?.hideTitle !== undefined
  );
};

export interface TitlesApi extends PublishesWritableTitle, PublishesWritableDescription {}

// SERIALIZED STATE ONLY TODO: Convert this to an instance of src/platform/packages/shared/presentation/presentation_publishing/state_manager/state_manager.ts
export const initializeTitleManager = (
  initialTitlesState: SerializedTitles
): StateManager<SerializedTitles> => initializeStateManager(initialTitlesState, defaultTitlesState);
