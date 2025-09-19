/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import deepEqual from 'fast-deep-equal';
import { pick, xor } from 'lodash';
import type { DashboardLayout } from './types';

/**
 * Checks whether the layouts have the same keys, and if they do, checks whether every layout item in the
 * original layout is deep equal to the layout item at the same ID in the new layout
 */
export const areLayoutsEqual = (originalLayout?: DashboardLayout, newLayout?: DashboardLayout) => {
  /**
   * It is safe to assume that there are **usually** more panels than sections, so do cheaper section ID comparison first
   */
  const newSectionUuids = Object.keys(newLayout?.sections ?? {});
  const sectionIdDiff = xor(Object.keys(originalLayout?.sections ?? {}), newSectionUuids);
  if (sectionIdDiff.length > 0) return false;

  /**
   * Since section IDs are equal, check for more expensive panel + control ID equality
   */
  const newPanelUuids = [
    ...Object.keys(newLayout?.panels ?? {}),
    ...Object.keys(newLayout?.controls ?? {}),
  ];
  const panelIdDiff = xor(
    [...Object.keys(originalLayout?.panels ?? {}), ...Object.keys(originalLayout?.controls ?? {})],
    newPanelUuids
  );
  if (panelIdDiff.length > 0) return false;

  /**
   * IDs of all widgets are equal, so now actually compare contents - this is the most expensive equality comparison step
   */
  // again, start with section comparison since it is most likely cheaper
  for (const sectionId of newSectionUuids) {
    if (!deepEqual(originalLayout?.sections[sectionId], newLayout?.sections[sectionId])) {
      return false;
    }
  }
  // then compare control state that layout manages (order, width, and grow; other state is managed by the control embeddable itself)
  for (const controlId of Object.keys(newLayout?.controls ?? {})) {
    if (
      !deepEqual(
        pick(originalLayout?.controls[controlId], ['grow', 'width', 'order']),
        pick(newLayout?.controls[controlId], ['grow', 'width', 'order'])
      )
    ) {
      return false;
    }
  }

  // then compare panel grid data
  for (const embeddableId of Object.keys(newLayout?.panels ?? {})) {
    if (
      !deepEqual(
        originalLayout?.panels[embeddableId]?.gridData,
        newLayout?.panels[embeddableId]?.gridData
      )
    ) {
      return false;
    }
  }
  return true;
};
