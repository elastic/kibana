/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { xor } from 'lodash';
import deepEqual from 'fast-deep-equal';
import { DashboardLayout } from './types';

/**
 * Checks whether the panel maps have the same keys, and if they do, whether the grid data and types of each panel
 * are equal.
 */
export const arePanelLayoutsEqual = (
  originalPanels?: DashboardLayout,
  newPanels?: DashboardLayout
) => {
  const originalUuids = Object.keys(originalPanels ?? {});
  const newUuids = Object.keys(newPanels ?? {});

  const idDiff = xor(originalUuids, newUuids);
  if (idDiff.length > 0) return false;

  for (const embeddableId of newUuids) {
    if (originalPanels?.[embeddableId]?.type !== newPanels?.[embeddableId]?.type) {
      return false;
    }
    if (!deepEqual(originalPanels?.[embeddableId]?.gridData, newPanels?.[embeddableId]?.gridData)) {
      return false;
    }
  }
  return true;
};
