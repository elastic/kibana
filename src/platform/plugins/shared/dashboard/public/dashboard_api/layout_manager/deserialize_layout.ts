/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { v4 } from 'uuid';
import type { Reference } from '@kbn/content-management-utils';
import { type DashboardState, isDashboardSection } from '../../../common';
import type { DashboardPanel } from '../../../server';
import type { DashboardChildState, DashboardLayout } from './types';

export function deserializeLayout(
  panels: DashboardState['panels'],
  controls: DashboardState['controlGroupInput'],
  getReferences: (id: string) => Reference[]
) {
  const childState: DashboardChildState = {};
  const layout: DashboardLayout = {
    panels: {},
    sections: {},
    controls: Object.values((controls ?? { controls: {} }).controls).reduce(
      (prev, control, index) => {
        const controlId = control.id ?? v4(); // TODO: Rename this to `uid`
        const { width, grow, ...rest } = control;
        childState[controlId] = { rawState: rest }; // push to child state
        return { ...prev, [controlId]: { type: control.type, width, grow, order: index } };
      },
      {}
    ),
  };

  function pushPanel(panel: DashboardPanel, sectionId?: string) {
    const panelId = panel.uid ?? v4();
    layout.panels[panelId] = {
      type: panel.type,
      grid: {
        ...panel.grid,
        ...(sectionId && { sectionId }),
      },
    };
    childState[panelId] = {
      rawState: {
        ...panel.config,
      },
      references: getReferences(panelId),
    };
  }

  panels.forEach((widget) => {
    if (isDashboardSection(widget)) {
      const { panels: sectionPanels, uid, ...restOfSection } = widget;
      const sectionId = uid ?? v4();
      layout.sections[sectionId] = {
        collapsed: false,
        ...restOfSection,
      };
      sectionPanels.forEach((panel) => {
        pushPanel(panel, sectionId);
      });
    } else {
      // if not a section, then this widget is a panel
      pushPanel(widget);
    }
  });
  return { layout, childState };
}
