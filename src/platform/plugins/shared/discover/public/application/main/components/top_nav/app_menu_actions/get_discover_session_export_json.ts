/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ESQL_CONTROL } from '@kbn/controls-constants';
import type { DiscoverSessionTab as StoredDiscoverSessionTab } from '@kbn/saved-search-plugin/common';
import type { DiscoverSessionTabAttributes } from '@kbn/saved-search-plugin/server';
import type {
  DiscoverSessionApiData,
  DiscoverSessionApiTab,
  DiscoverSessionWarning,
} from '../../../../../../server';
import { getDiscoverSessionTab } from '../../../../../../common/api/converters';
import type { DiscoverServices } from '../../../../../build_services';
import {
  fromTabStateToSavedObjectTab,
  selectAllTabs,
  selectTab,
  selectTabRuntimeState,
  type DiscoverInternalState,
  type RuntimeStateManager,
  type TabState,
} from '../../../state_management/redux';

const getControlPanels = (
  controlGroupState: TabState['attributes']['controlGroupState']
): DiscoverSessionApiTab['control_panels'] => {
  if (!controlGroupState) {
    return undefined;
  }

  const controlPanels = Object.entries(controlGroupState)
    .sort(([, firstPanel], [, secondPanel]) => firstPanel.order - secondPanel.order)
    .map(([id, panel]): NonNullable<DiscoverSessionApiTab['control_panels']>[number] => {
      const { order, width, grow, type, ...config } = panel;

      if (type !== ESQL_CONTROL && type !== 'esqlControl') {
        throw new Error(`Unsupported Discover control type: ${type}`);
      }

      return {
        id,
        type: ESQL_CONTROL,
        width,
        grow,
        config,
      };
    });

  return controlPanels.length ? controlPanels : undefined;
};

const getApiTab = (
  tab: StoredDiscoverSessionTab,
  controlGroupState: TabState['attributes']['controlGroupState']
): ReturnType<typeof getDiscoverSessionTab> => {
  const { id, label, serializedSearchSource, ...storedAttributes } = tab;
  const attributes: DiscoverSessionTabAttributes = {
    ...storedAttributes,
    kibanaSavedObjectMeta: {
      searchSourceJSON: JSON.stringify(serializedSearchSource),
    },
  };
  const controlPanels = getControlPanels(controlGroupState);

  return getDiscoverSessionTab({
    tab: { id, label, attributes },
    controlPanels,
  });
};

export const getDiscoverSessionExportJson = ({
  getState,
  runtimeStateManager,
  services,
  tabId,
  title,
}: {
  getState: () => DiscoverInternalState;
  runtimeStateManager: RuntimeStateManager;
  services: DiscoverServices;
  tabId?: string;
  title: string;
}): { sessionState: DiscoverSessionApiData; warnings: DiscoverSessionWarning[] } => {
  const state = getState();
  const tabs = tabId ? [selectTab(state, tabId)] : selectAllTabs(state);
  const transformedTabs = tabs.map((tab) => {
    const currentDataView = selectTabRuntimeState(
      runtimeStateManager,
      tab.id
    )?.currentDataView$.getValue();

    const storedTab = fromTabStateToSavedObjectTab({
      tab,
      currentDataView,
      services,
    });

    if (tab.overriddenVisContextAfterInvalidation) {
      storedTab.visContext = tab.overriddenVisContextAfterInvalidation;
    }

    return getApiTab(storedTab, tab.attributes.controlGroupState);
  });

  return {
    sessionState: {
      title,
      description: state.persistedDiscoverSession?.description ?? '',
      tags: state.persistedDiscoverSession?.tags,
      tabs: transformedTabs.map(({ apiTab }) => apiTab),
    },
    warnings: transformedTabs.flatMap(({ warnings }) => warnings),
  };
};
