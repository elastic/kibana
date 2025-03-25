/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { flow } from 'lodash';
import type { SavedObjectReference } from '@kbn/core/server';
import type { EmbeddableStart } from '@kbn/embeddable-plugin/server';
import type { SavedDashboardPanel } from '../../../../dashboard_saved_object';
import type { DashboardAttributes } from '../../types';
import { getReferencesForPanelId } from '../../../../../common';

export function transformPanelsOut(
  panelsJSON: string,
  embeddable: EmbeddableStart,
  references?: SavedObjectReference[]
): DashboardAttributes['panels'] {
  return flow(JSON.parse, transformPanelsProperties, (panels: DashboardAttributes['panels']) =>
    injectPanelReferences(embeddable, references, panels)
  )(panelsJSON);
}

function transformPanelsProperties(panels: SavedDashboardPanel[]) {
  return panels.map(
    ({ embeddableConfig, gridData, id, panelIndex, panelRefName, title, type, version }) => ({
      gridData,
      id,
      panelConfig: embeddableConfig,
      panelIndex,
      panelRefName,
      title,
      type,
      version,
    })
  );
}

function injectPanelReferences(
  embeddable: EmbeddableStart,
  references: SavedObjectReference[] = [],
  panels: DashboardAttributes['panels']
) {
  const injectedPanels = panels.map((panel) => {
    if (!panel.panelIndex) return panel;
    const panelReferences = getReferencesForPanelId(panel.panelIndex, references);
    const { type: embeddableType, ...injectedPanelConfig } = embeddable.inject(
      { type: panel.type, ...panel.panelConfig },
      panelReferences
    );
    return {
      ...panel,
      panelConfig: injectedPanelConfig,
    };
  });
  return injectedPanels;
}
