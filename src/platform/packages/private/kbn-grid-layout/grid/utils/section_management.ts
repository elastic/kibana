/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { cloneDeep } from 'lodash';

import { GridSectionData, OrderedLayout } from '../types';
import { resolveGridSection } from './resolve_grid_section';

/**
 * Move the panels in the `startingSection` to the bottom of the `newSection` and resolve the resulting panels
 * @param startingSectionPanels The source section for the panels
 * @param newSectionPanels The destination section for the panels
 * @returns Combined panel list
 */
export const combinePanels = (
  startingSectionPanels: GridSectionData['panels'],
  newSectionPanels: GridSectionData['panels']
): GridSectionData['panels'] => {
  const panelsToMove = cloneDeep(startingSectionPanels);
  const startingPanels = Object.values(newSectionPanels);
  const maxRow =
    startingPanels.length > 0
      ? Math.max(...startingPanels.map(({ row, height }) => row + height))
      : 0;
  Object.keys(panelsToMove).forEach((index) => (panelsToMove[index].row += maxRow));
  const resolvedPanels = resolveGridSection({ ...newSectionPanels, ...panelsToMove });
  return resolvedPanels;
};

/**
 * Deletes an entire row from the layout, including all of its panels
 * @param layout Starting layout
 * @param rowIndex The row to be deleted
 * @returns Updated layout with the row at `rowIndex` deleted
 */
export const deleteRow = (layout: OrderedLayout, sectionId: string) => {
  const newLayout = cloneDeep(layout);
  delete newLayout[sectionId];
  return newLayout;
};
