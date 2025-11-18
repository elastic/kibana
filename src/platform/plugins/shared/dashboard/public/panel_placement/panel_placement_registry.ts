/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import type { GetPanelSettings } from './types';

const registry = new Map<string, GetPanelSettings<object>>();

export const registerDashboardPanelSettings = <SerializedState extends object = object>(
  embeddableType: string,
  getPanelSettings: GetPanelSettings<SerializedState>
) => {
  if (registry.has(embeddableType)) {
    throw new Error(
      i18n.translate('dashboard.panelPlacement.panelPlacementSettingsExistsError', {
        defaultMessage: 'Panel placement settings for embeddable type {panelType} already exists',
        values: { panelType: embeddableType },
      })
    );
  }
  registry.set(embeddableType, getPanelSettings as GetPanelSettings<object>);
};

/**
 * Use getPanelPlacementSetting to access registry
 */
export const getRegistryItem = (embeddableType: string) => {
  return registry.get(embeddableType);
};
