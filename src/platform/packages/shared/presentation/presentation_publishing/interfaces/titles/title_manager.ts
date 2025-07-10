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
import { PublishesTitle, PublishesWritableTitle } from './publishes_title';

export interface SerializedTitles {
  title?: string;
  description?: string;
  hidePanelTitles?: boolean;
}

const defaultTitlesState: WithAllKeys<SerializedTitles> = {
  title: undefined,
  description: undefined,
  hidePanelTitles: undefined,
};

export const titleComparators: StateComparators<SerializedTitles> = {
  title: 'referenceEquality',
  description: 'referenceEquality',
  hidePanelTitles: (a, b) => Boolean(a) === Boolean(b),
};

export const stateHasTitles = (state: unknown): state is SerializedTitles => {
  return (
    (state as SerializedTitles)?.title !== undefined ||
    (state as SerializedTitles)?.description !== undefined ||
    (state as SerializedTitles)?.hidePanelTitles !== undefined
  );
};

export interface TitlesApi extends PublishesWritableTitle, PublishesWritableDescription {}

export const initializeTitleManager = (
  initialTitlesState: SerializedTitles
): StateManager<SerializedTitles> & {
  api: {
    hideTitle$: PublishesTitle['hideTitle$'];
    setHideTitle: PublishesWritableTitle['setHideTitle'];
  };
} => {
  const stateManager = initializeStateManager(initialTitlesState, defaultTitlesState);
  return {
    ...stateManager,
    api: {
      ...stateManager.api,
      // SerializedTitles defines hideTitles as hidePanelTitles
      // This state is persisted and this naming conflict will be resolved TBD
      // add named APIs that match interface names as a work-around
      hideTitle$: stateManager.api.hidePanelTitles$,
      setHideTitle: stateManager.api.setHidePanelTitles,
    },
  };
};
