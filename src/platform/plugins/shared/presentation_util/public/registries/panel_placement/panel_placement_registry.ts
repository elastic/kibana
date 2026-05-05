/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import type { PanelSettingsGetter } from './types';

const registry = new Map<string, PanelSettingsGetter<object>>();

export const registerPanelPlacementSettings = <SerializedState extends object = object>(
  embeddableType: string,
  getPanelSettings: PanelSettingsGetter<SerializedState>
) => {
  if (registry.has(embeddableType)) {
    throw new Error(
      i18n.translate('presentationUtil.panelPlacement.panelPlacementSettingsExistsError', {
        defaultMessage: 'Panel placement settings for embeddable type {panelType} already exists',
        values: { panelType: embeddableType },
      })
    );
  }
  registry.set(embeddableType, getPanelSettings as PanelSettingsGetter<object>);
};

/**
 * Use getPanelPlacementSettings to access registry
 */
export const getPanelPlacementSettings = async <SerializedState extends object = object>(
  embeddableType: string,
  serializedState?: SerializedState
) => {
  const panelSettingsGetter = registry.get(embeddableType);
  if (!panelSettingsGetter) return undefined;
  return await panelSettingsGetter(serializedState);
};
