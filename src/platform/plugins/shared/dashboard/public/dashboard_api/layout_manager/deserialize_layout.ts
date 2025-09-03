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
import { type DashboardState, isDashboardSection, getReferencesForControls } from '../../../common';
import type { DashboardPanel } from '../../../server';
import type { DashboardChildState, DashboardLayout } from './types';

export function deserializeLayout(
  panels: DashboardState['panels'],
  initialControls: DashboardState['controlGroupInput'],
  references: Reference[],
  getReferences: (id: string) => Reference[]
) {
  if (typeof initialControls === 'function') debugger;
  // console.log({ panels, initialControls });
  const layout: DashboardLayout = {
    panels: {},
    sections: {},
    controls: Object.values((initialControls ?? { controls: {} }).controls).reduce(
      (prev, control) => {
        return { ...prev, [control.id ?? v4()]: control };
      },
      {}
    ),
  };
  const childState: DashboardChildState = {
    ...Object.values((initialControls ?? { controls: {} }).controls).reduce((prev, control) => {
      // console.log('REFS', references, getReferencesForControls(references, control.id));
      return {
        ...prev,
        [control.id ?? v4()]: {
          rawState: control.controlConfig,
          references: control.id ? getReferencesForControls(references, control.id) : [],
        },
      };
    }, {}),
  };

  function pushPanel(panel: DashboardPanel, sectionId?: string) {
    const panelId = panel.panelIndex ?? v4();
    layout.panels[panelId] = {
      type: panel.type,
      gridData: {
        ...panel.gridData,
        ...(sectionId && { sectionId }),
        i: panelId,
      },
    };
    // console.log('OTHER REFS', getReferences(panelId));
    childState[panelId] = {
      rawState: {
        ...panel.panelConfig,
      },
      references: getReferences(panelId),
    };
  }

  panels.forEach((widget) => {
    if (isDashboardSection(widget)) {
      const sectionId = widget.gridData.i ?? v4();
      const { panels: sectionPanels, ...restOfSection } = widget;
      layout.sections[sectionId] = {
        collapsed: false,
        ...restOfSection,
        gridData: {
          ...widget.gridData,
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
