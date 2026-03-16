/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import deepEqual from 'fast-deep-equal';
import { pick } from 'lodash';

import type { GridSectionData } from '../../grid_section';
import type { GridLayoutStateManager, OrderedLayout } from '../../types';
import { getPanelKeysInOrder, getSectionsInOrder } from '../../utils/resolve_grid_section';
import { resolveSections } from '../../utils/section_management';
import { getSensorType } from '../sensors';
import type { PointerPosition, UserInteractionEvent } from '../types';

let startingLayout: OrderedLayout | undefined;

export const startAction = (
  e: UserInteractionEvent,
  gridLayoutStateManager: GridLayoutStateManager,
  sectionId: string
) => {
  const headerRef = gridLayoutStateManager.headerRefs.current[sectionId];
  if (!headerRef) return;

  startingLayout = gridLayoutStateManager.gridLayout$.getValue();
  const startingPosition = pick(headerRef.getBoundingClientRect(), ['top', 'left']);
  gridLayoutStateManager.activeSectionEvent$.next({
    id: sectionId,
    startingPosition,
    sensorType: getSensorType(e),
    translate: {
      top: 0,
      left: 0,
    },
  });
};

export const commitAction = ({ activeSectionEvent$, headerRefs }: GridLayoutStateManager) => {
  const event = activeSectionEvent$.getValue();
  activeSectionEvent$.next(undefined);

  if (!event) return;
  headerRefs.current[event.id]?.scrollIntoView({
    behavior: 'smooth',
    block: 'center',
  });
};

export const cancelAction = ({
  activeSectionEvent$,
  gridLayout$,
  headerRefs,
}: GridLayoutStateManager) => {
  const event = activeSectionEvent$.getValue();
  activeSectionEvent$.next(undefined);
  if (startingLayout) {
    gridLayout$.next(startingLayout);
  }

  if (!event) return;
  headerRefs.current[event.id]?.scrollIntoView({
    behavior: 'smooth',
    block: 'center',
  });
};

export const moveAction = (
  gridLayoutStateManager: GridLayoutStateManager,
  startingPointer: PointerPosition,
  currentPointer: PointerPosition
) => {
  const currentActiveSectionEvent = gridLayoutStateManager.activeSectionEvent$.getValue();
  if (!currentActiveSectionEvent) return;

  const {
    runtimeSettings$: { value: runtimeSettings },
    headerRefs: { current: gridHeaderElements },
    sectionRefs: { current: gridSectionElements },
  } = gridLayoutStateManager;

  const currentLayout = gridLayoutStateManager.gridLayout$.getValue();

  // check which section ID is being targeted
  const activeRowRect = gridHeaderElements[
    currentActiveSectionEvent.id
  ]?.getBoundingClientRect() ?? {
    top: 0,
    bottom: 0,
  };
  const targetSectionId: string | undefined = (() => {
    let currentTargetSection;
    Object.entries(gridSectionElements).forEach(([id, section]) => {
      const { top, bottom } = section?.getBoundingClientRect() ?? { top: 0, bottom: 0 };
      if (activeRowRect.bottom >= top && activeRowRect.top <= bottom) {
        currentTargetSection = id;
      }
    });
    return currentTargetSection;
  })();

  if (!targetSectionId || !currentLayout[targetSectionId].isMainSection) {
    // when not targetting an existing main section, then simply re-order the columns based on their positions in the DOM
    const sortedRows = Object.entries({ ...gridHeaderElements, ...gridSectionElements })
      .map(([id, row]) => {
        // by spreading in this way, we use the grid wrapper elements for expanded sections and the headers for collapsed sections
        const { top, height } = row?.getBoundingClientRect() ?? { top: 0, height: 0 };
        return { id, middle: top + height / 2 };
      })
      .sort(({ middle: middleA }, { middle: middleB }) => middleA - middleB);
    const ordersAreEqual = sortedRows.every(
      (section, index) => currentLayout[section.id].order === index
    );
    if (!ordersAreEqual) {
      const orderedLayout: OrderedLayout = {};
      sortedRows.forEach((row, index) => {
        orderedLayout[row.id] = {
          ...currentLayout[row.id],
          order: index,
        };
      });
      gridLayoutStateManager.gridLayout$.next(orderedLayout);
    }
  } else {
    // when a main section is being targeted, allow the header to be dropped between panels
    const { gutterSize, rowHeight } = runtimeSettings;

    const targetRow = (() => {
      const targetedGridSection = gridSectionElements[targetSectionId];
      const targetedGridSectionRect = targetedGridSection?.getBoundingClientRect();
      const targetedGridTop = targetedGridSectionRect?.top ?? 0;
      const localYCoordinate = activeRowRect.top - targetedGridTop;
      return Math.max(Math.round(localYCoordinate / (rowHeight + gutterSize)), 0);
    })();

    // rebuild layout by splittng the targeted sectionId into 2
    let order = 0;
    const firstSectionOrder = currentLayout[targetSectionId].order;
    const splitLayout: OrderedLayout = {};
    getSectionsInOrder(currentLayout).forEach((section) => {
      const { id } = section;
      if (id === currentActiveSectionEvent.id) return;

      if (section.order < firstSectionOrder) {
        splitLayout[id] = section;
      } else if (section.order === firstSectionOrder) {
        // split this section into 2 - one main section above the dragged section, and one below
        const topSectionPanels: GridSectionData['panels'] = {};
        const bottomSectionPanels: GridSectionData['panels'] = {};
        let startingRow: number;
        getPanelKeysInOrder(section.panels).forEach((panelId) => {
          const panel = section.panels[panelId];
          if (panel.row < targetRow) {
            topSectionPanels[panel.id] = panel;
          } else {
            if (startingRow === undefined) {
              startingRow = panel.row;
            }
            bottomSectionPanels[panel.id] = { ...panel, row: panel.row - startingRow };
          }
        });

        if (Object.keys(topSectionPanels).length > 0) {
          splitLayout[`main-${order}`] = {
            id: `main-${order}`,
            isMainSection: true,
            order,
            panels: topSectionPanels,
          };
          order++;
        }
        splitLayout[currentActiveSectionEvent.id] = {
          ...currentLayout[currentActiveSectionEvent.id],
          order,
        };
        order++;

        if (Object.keys(bottomSectionPanels).length > 0) {
          splitLayout[`main-${order}`] = {
            id: `main-${order}`,
            isMainSection: true,
            order,
            panels: bottomSectionPanels,
          };
        }
      } else {
        // push each other section down
        const sectionId = section.isMainSection ? `main-${order}` : id;
        splitLayout[sectionId] = { ...section, id: sectionId, order };
      }
      order++;
    });

    const finalLayout = resolveSections(splitLayout);
    if (!deepEqual(currentLayout, finalLayout)) {
      gridLayoutStateManager.gridLayout$.next(finalLayout);
    }
  }
  // update the dragged element
  gridLayoutStateManager.activeSectionEvent$.next({
    ...currentActiveSectionEvent,
    targetSection: targetSectionId,
    translate: {
      top: currentPointer.clientY - startingPointer.clientY,
      left: currentPointer.clientX - startingPointer.clientX,
    },
  });
};
