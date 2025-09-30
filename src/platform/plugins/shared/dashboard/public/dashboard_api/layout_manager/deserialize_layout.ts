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
  getReferences: (id: string) => Reference[]
) {
  const layout: DashboardLayout = {
    panels: {},
    sections: {},
  };
  const childState: DashboardChildState = {};

  function pushPanel(panel: DashboardPanel, sectionId?: string) {
    const panelId = panel.uid ?? v4();
    layout.panels[panelId] = {
      type: panel.type,
      grid: {
        ...panel.grid,
        ...(sectionId && { sectionId }),
        i: panelId,
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
      const sectionId = widget.grid.i ?? v4();
      const { panels: sectionPanels, ...restOfSection } = widget;
      layout.sections[sectionId] = {
        collapsed: false,
        ...restOfSection,
        grid: {
          ...widget.grid,
          i: sectionId,
        },
      };
      (sectionPanels as DashboardPanel[]).forEach((panel) => {
        pushPanel(panel, sectionId);
      });
    } else {
      // if not a section, then this widget is a panel
      pushPanel(widget);
    }
  });
  return { layout, childState };
}
