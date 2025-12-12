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
  const { controlGroupInput, references, panels, ...rest } = dashboardState;
  if (controlGroupInput) {
    warnings.push(`Dropped unmapped key 'controlGroupInput' from dashboard`);
  }
  if (references) {
    warnings.push(`Dropped unmapped key 'references' from dashboard`);
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

    if (!transforms?.schema) {
      warnings.push(
        `Dropped panel ${panel.uid}, panel schema not available for panel type: ${panel.type}. Panels without schemas are not supported by dashboard REST endpoints`
      );
    }
    return Boolean(transforms?.schema);
  }

  function removeEnhancements(panel: DashboardPanel) {
    const { enhancements, ...restOfConfig } = panel.config as { enhancements?: unknown };
    if (enhancements) {
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
  if (dashboardState.controlGroupInput) {
    throw new Error('controlGroupInput key is not supported by dashboard REST endpoints.');
  }

  if (dashboardState.references) {
    throw new Error('references key is not supported by dashboard REST endpoints.');
  }

  function throwOnUnmappedPanelKeys(panel: DashboardPanel) {
    const transforms = embeddableService?.getTransforms(panel.type);
    if (!transforms?.schema) {
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
