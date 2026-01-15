/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { asyncMap } from '@kbn/std';
import type { Reference } from '@kbn/content-management-utils';
import type { DashboardState, DashboardPanel } from '../../../server';
import { getReferencesForPanelId, isDashboardSection } from '../../../common';
import { embeddableService } from '../../services/kibana_services';

export async function transformPanels(panels: DashboardState['panels'], references?: Reference[]) {
  function filterReferences(panelId?: string) {
    return !references || !panelId ? undefined : getReferencesForPanelId(panelId, references);
  }

  return await asyncMap(panels ?? [], async (panel) => {
    if (isDashboardSection(panel)) {
      const panelsInSection = await asyncMap(panel.panels, async (panelInSection) => {
        return await transformPanel(panelInSection, filterReferences(panelInSection.uid));
      });
      return {
        ...panel,
        panels: panelsInSection,
      };
    }

    return await transformPanel(panel, filterReferences(panel.uid));
  });
}

async function transformPanel(panel: DashboardPanel, references?: Reference[]) {
  const transformOut = await embeddableService.getLegacyURLTransform(panel.type);
  if (!transformOut) return panel;

  try {
    const transformedPanelConfig = transformOut(panel.config, references);
    return {
      ...panel,
      config: transformedPanelConfig,
    };
  } catch (transformOutError) {
    // eslint-disable-next-line no-console
    console.warn(
      `Unable to transform panel state, panelId: ${panel.uid}, error: ${transformOutError}`
    );
    // do not prevent dashboard render on transform error
    return panel;
  }
}
