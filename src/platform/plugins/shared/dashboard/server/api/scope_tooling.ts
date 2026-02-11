/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isDashboardSection } from '../../common';
import { embeddableService } from '../kibana_services';
import type { DashboardPanel, DashboardState } from './types';

export function stripUnmappedKeys(dashboardState: DashboardState) {
  const warnings: string[] = [];
  const { pinned_panels, panels, ...rest } = dashboardState;
  if (pinned_panels) {
    warnings.push(`Dropped unmapped key 'pinned_panels' from dashboard`);
  }

  function isMappedPanelType(panel: DashboardPanel) {
    const transforms = embeddableService?.getTransforms(panel.type);
    if (transforms?.throwOnUnmappedPanel) {
      try {
        transforms.throwOnUnmappedPanel(panel.config);
      } catch (e) {
        warnings.push(
          `Dropped panel ${panel.uid}, panel config is not supported. Reason: ${e.message}.`
        );
        return false;
      }
    }

    const panelSchema = transforms?.getSchema?.();

    if (!panelSchema) {
      warnings.push(
        `Dropped panel ${panel.uid}, panel schema not available for panel type: ${panel.type}. Panels without schemas are not supported by dashboard REST endpoints`
      );
    }
    return Boolean(panelSchema);
  }

  function removeEnhancements(panel: DashboardPanel) {
    const { enhancements, ...restOfConfig } = panel.config as {
      enhancements?: { dynamicActions: { events: [] } };
    };
    if (
      typeof enhancements?.dynamicActions === 'object' &&
      Array.isArray(enhancements?.dynamicActions?.events) &&
      enhancements.dynamicActions.events.length
    ) {
      warnings.push(`Dropped unmapped panel config key 'enhancements' from panel ${panel.uid}`);
    }
    return {
      ...panel,
      config: restOfConfig,
    };
  }

  const mappedPanels = (panels ?? [])
    .filter((panel) => isDashboardSection(panel) || isMappedPanelType(panel))
    .map((panel) => {
      if (!isDashboardSection(panel)) return removeEnhancements(panel);
      const { panels: sectionPanels, ...restOfSection } = panel;
      return {
        ...restOfSection,
        panels: sectionPanels.filter(isMappedPanelType).map(removeEnhancements),
      };
    });

  return {
    data: {
      ...rest,
      panels: mappedPanels,
    },
    warnings,
  };
}

export function throwOnUnmappedKeys(dashboardState: DashboardState) {
  if (dashboardState.pinned_panels) {
    throw new Error('pinned_panels key is not supported by dashboard REST endpoints.');
  }

  function throwOnUnmappedPanelKeys(panel: DashboardPanel) {
    const transforms = embeddableService?.getTransforms(panel.type);
    const panelSchema = transforms?.getSchema?.();

    if (!panelSchema) {
      throw new Error(
        `Panel schema not available for panel type: ${panel.type}. Panels without schemas are not supported by dashboard REST endpoints`
      );
    }

    if ((panel.config as { enhancements?: unknown }).enhancements) {
      throw new Error(
        'enhancements panel config key is not supported by dashboard REST endpoints.'
      );
    }
  }

  dashboardState.panels?.forEach((panel) => {
    if (isDashboardSection(panel)) {
      panel.panels.forEach(throwOnUnmappedPanelKeys);
    } else {
      throwOnUnmappedPanelKeys(panel);
    }
  });
}
