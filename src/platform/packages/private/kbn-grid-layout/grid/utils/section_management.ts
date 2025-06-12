/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { cloneDeep } from 'lodash';

import type { CollapsibleSection, GridSectionData, MainSection } from '../grid_section';
import type { OrderedLayout } from '../types';
import { getSectionsInOrder, resolveGridSection } from './resolve_grid_section';

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
 * Deletes an entire section from the layout, including all of its panels
 * @param layout Starting layout
 * @param sectionId The section to be deleted
 * @returns Updated layout with the section at `sectionId` deleted and orders adjusted
 */
export const deleteSection = (layout: OrderedLayout, sectionId: string) => {
  const newLayout = cloneDeep(layout);
  delete newLayout[sectionId];
  return resolveSections(newLayout);
};

/**
 * Combine sequential main layouts and redefine section orders to keep layout consistent + valid
 * @param layout Starting layout
 * @returns Updated layout with `main` sections combined + section orders resolved
 */
export const resolveSections = (layout: OrderedLayout) => {
  const sortedSections = getSectionsInOrder(layout);
  const resolvedLayout: OrderedLayout = {};
  let order = 0;
  for (let i = 0; i < sortedSections.length; i++) {
    const firstSection = sortedSections[i];
    if (firstSection.isMainSection && Object.keys(firstSection.panels).length === 0) {
      // do not include empty main sections
      continue;
    }
    if (firstSection.isMainSection) {
      let combinedPanels: GridSectionData['panels'] = { ...firstSection.panels };
      while (i + 1 < sortedSections.length) {
        const secondSection = sortedSections[i + 1];
        if (!secondSection.isMainSection) break;
        combinedPanels = combinePanels(secondSection.panels, combinedPanels);
        i++;
      }
      resolvedLayout[`main-${order}`] = {
        ...firstSection,
        order,
        panels: combinedPanels,
        id: `main-${order}`,
      };
    } else {
      resolvedLayout[firstSection.id] = { ...firstSection, order };
    }
    order++;
  }
  return resolvedLayout;
};

export const isCollapsibleSection = (
  section: CollapsibleSection | MainSection
): section is CollapsibleSection => !section.isMainSection;
