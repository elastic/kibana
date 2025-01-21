/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { cloneDeep } from 'lodash';
import deepEqual from 'fast-deep-equal';
import { GridLayoutStateManager, UserInteractionEvent } from '../types';
import { getPointerOffsets } from './pointer_event_utils';

export const startAction = (
  gridLayoutStateManager: GridLayoutStateManager,
  e: UserInteractionEvent,
  type: 'drag' | 'resize',
  rowIndex: number,
  panelId: string
) => {
  const panelRef = gridLayoutStateManager.panelRefs.current[rowIndex][panelId];
  if (!panelRef) return;

  const panelRect = panelRef.getBoundingClientRect();

  gridLayoutStateManager.interactionEvent$.next({
    type,
    id: panelId,
    panelDiv: panelRef,
    targetRowIndex: rowIndex,
    pointerOffsets: getPointerOffsets(e, panelRect),
  });
};

export const commitAction = ({
  activePanel$,
  interactionEvent$,
  stableGridLayout$,
  gridLayout$,
}: GridLayoutStateManager) => {
  activePanel$.next(undefined);
  interactionEvent$.next(undefined);
  if (!deepEqual(gridLayout$.getValue(), stableGridLayout$.getValue())) {
    stableGridLayout$.next(cloneDeep(gridLayout$.getValue()));
  }
};
