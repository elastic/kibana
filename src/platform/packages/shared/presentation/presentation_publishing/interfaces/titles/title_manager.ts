/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SerializedTitles } from '@kbn/presentation-publishing-schemas';
import type { WithAllKeys } from '../../state_manager';
import { initializeStateManager } from '../../state_manager/state_manager';
import type { StateComparators, StateManager } from '../../state_manager/types';
import type { PublishesWritableDescription } from './publishes_description';
import type { PublishesWritableTitle } from './publishes_title';

export type { SerializedTitles } from '@kbn/presentation-publishing-schemas';

export type TitleManager = { api: PublishesWritableTitle & PublishesWritableDescription } & Pick<
  StateManager<SerializedTitles>,
  'anyStateChange$' | 'getLatestState' | 'reinitializeState'
>;

const defaultTitlesState: WithAllKeys<SerializedTitles> = {
  title: undefined,
  description: undefined,
  hide_title: undefined,
};

export const titleComparators: StateComparators<SerializedTitles> = {
  title: 'referenceEquality',
  description: 'referenceEquality',
  hide_title: (a, b) => Boolean(a) === Boolean(b),
};

export const stateHasTitles = (state: unknown): state is SerializedTitles => {
  return (
    (state as SerializedTitles)?.title !== undefined ||
    (state as SerializedTitles)?.description !== undefined ||
    (state as SerializedTitles)?.hide_title !== undefined
  );
};

export interface TitlesApi extends PublishesWritableTitle, PublishesWritableDescription {}

export const initializeTitleManager = (initialTitlesState: SerializedTitles): TitleManager => {
  return initializeStateManager(initialTitlesState, defaultTitlesState);
};
