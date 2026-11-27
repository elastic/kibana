/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import deepEqual from 'fast-deep-equal';
import {
  BehaviorSubject,
  combineLatest,
  distinctUntilChanged,
  map,
  mergeMap,
  startWith,
  type Observable,
} from 'rxjs';

import type { LayoutConstraints } from '@kbn/embeddable-plugin/public';
import type { GridLayoutData, GridPanelData, GridSectionData } from '@kbn/grid-layout';
import { asyncForEach } from '@kbn/std';

import { embeddableService } from '../../services/kibana_services';
import type { DashboardLayout } from './types';

/**
 * Converts the dashboard layout into the shape `@kbn/grid-layout` renders.
 * - Every section becomes a top-level section entry (keyed by section id) with an empty `panels` map.
 * - Panels in a section are nested under that section, with their `row` relative to the section.
 * - Panels outside of any section become top-level `panel` entries (keyed by panel id).
 * - `resizeSettings` supplies per-panel-type resize constraints; types without an entry get none.
 */
export const transformDashboardLayoutToGridLayout = (
  layout: DashboardLayout,
  resizeSettings: { [panelType: string]: LayoutConstraints }
) => {
  const newLayout: GridLayoutData = {};
  Object.keys(layout.sections).forEach((sectionId) => {
    const section = layout.sections[sectionId];
    newLayout[sectionId] = {
      id: sectionId,
      type: 'section',
      row: section.grid.y,
      isCollapsed: Boolean(section.collapsed),
      title: section.title,
      panels: {},
    };
  });
  Object.keys(layout.panels).forEach((panelId) => {
    const grid = layout.panels[panelId].grid;
    const type = layout.panels[panelId].type;
    const basePanel = {
      id: panelId,
      row: grid.y,
      column: grid.x,
      width: grid.w,
      height: grid.h,
      resizeOptions: resizeSettings[type],
    } as GridPanelData;
    if (grid.sectionId) {
      (newLayout[grid.sectionId] as GridSectionData).panels[panelId] = basePanel;
    } else {
      newLayout[panelId] = {
        ...basePanel,
        type: 'panel',
      };
    }
  });
  return newLayout;
};

/**
 * Derives the grid layout used for rendering from `layout$`, and keeps it in sync
 * (including per-panel-type resize constraints, which load asynchronously).
 */
export function initializeGridLayout(layout$: BehaviorSubject<DashboardLayout>) {
  const gridLayout$ = new BehaviorSubject(transformDashboardLayoutToGridLayout(layout$.value, {}));

  const panelResizeSettings$: Observable<{ [panelType: string]: LayoutConstraints }> = layout$.pipe(
    map(({ panels }) => {
      return [...new Set(Object.values(panels).map((panel) => panel.type))];
    }),
    distinctUntilChanged(deepEqual),
    mergeMap(async (panelTypes: string[]) => {
      const resizeConstraints: { [panelType: string]: LayoutConstraints } = {};
      await asyncForEach(panelTypes, async (type) => {
        const embeddableDefinition = await embeddableService.getEmbeddableDefinition(type);
        if (embeddableDefinition && embeddableDefinition.layoutConstraints) {
          resizeConstraints[type] = embeddableDefinition.layoutConstraints;
        }
      });
      return resizeConstraints;
    }),
    startWith({}) // do not block rendering by waiting for these settings
  );

  const subscription = combineLatest([layout$, panelResizeSettings$]).subscribe(
    ([layout, panelResizeSettings]) => {
      gridLayout$.next(transformDashboardLayoutToGridLayout(layout, panelResizeSettings));
    }
  );

  return { gridLayout$, cleanup: () => subscription.unsubscribe() };
}
