/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ControlsGroupState, PinnedControlLayoutState } from '@kbn/controls-schemas';

import { omit } from 'lodash';
import { type DashboardState, prefixReferencesFromPanel } from '../../../common';
import type { DashboardChildState, DashboardLayout } from './types';
import type { DashboardSection } from '../../../server';

export function serializeLayout(
  layout: DashboardLayout,
  childState: DashboardChildState,
  childrenIds?: string[] // used if you want to serialize a **subset** of the layout
): Pick<DashboardState, 'panels' | 'references' | 'controlGroupInput'> {
  const sections: { [sectionId: string]: DashboardSection } = {};
  Object.entries(layout.sections).forEach(([sectionId, sectionState]) => {
    sections[sectionId] = { ...sectionState, uid: sectionId, panels: [] };
  });

  const childrenToSerialize: string[] = childrenIds ?? Object.keys(childState);

  const references: DashboardState['references'] = [];
  const panels: DashboardState['panels'] = [];
  const controls: Array<
    PinnedControlLayoutState & {
      config: Required<DashboardState>['controlGroupInput']['controls'][number]['config'];
    }
  > = [];

  childrenToSerialize.forEach((panelId) => {
    const config = childState[panelId]?.rawState ?? {};
    references.push(...prefixReferencesFromPanel(panelId, childState[panelId]?.references ?? []));

    const panelLayout = layout.panels[panelId];
    const controlLayout = layout.controls[panelId];

    if (panelLayout) {
      const { sectionId, ...restOfGridData } = panelLayout.grid; // drop section ID
      const panelState = {
        uid: panelId,
        type: panelLayout.type,
        grid: restOfGridData,
        config,
      };
      if (sectionId) {
        sections[sectionId].panels.push(panelState);
      } else {
        panels.push(panelState);
      }
    } else if (controlLayout) {
      controls.push({
        uid: panelId,
        ...controlLayout,
        config,
      });
    }
  });

  return {
    panels: [...panels, ...Object.values(sections)],
    controlGroupInput: {
      controls: controls
        .sort(({ order: orderA }, { order: orderB }) => orderA - orderB)
        .map((control) => {
          // drop the order now that things are sorted
          return omit(control, 'order') as ControlsGroupState['controls'][number];
        }),
    },
    references,
  };
}
