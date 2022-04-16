/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiCheckboxGroup } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import moment from 'moment';
import React, { ReactElement, useState } from 'react';
import type { Capabilities } from '@kbn/core/public';
import { DashboardSavedObject } from '../..';
import { shareModalStrings } from '../../dashboard_strings';
import { DashboardAppLocatorParams, DASHBOARD_APP_LOCATOR } from '../../locator';
import { TimeRange } from '../../services/data';
import { ViewMode } from '../../services/embeddable';
import { setStateToKbnUrl, unhashUrl } from '../../services/kibana_utils';
import { SharePluginStart } from '../../services/share';
import { DashboardAppCapabilities, DashboardState } from '../../types';
import { dashboardUrlParams } from '../dashboard_router';
import { stateToRawDashboardState } from '../lib/convert_dashboard_state';
import { convertPanelMapToSavedPanels } from '../lib/convert_dashboard_panels';
import { DashboardSessionStorage } from '../lib';

const showFilterBarId = 'showFilterBar';

export interface ShowShareModalProps {
  isDirty: boolean;
  timeRange: TimeRange;
  kibanaVersion: string;
  share: SharePluginStart;
  anchorElement: HTMLElement;
  savedDashboard: DashboardSavedObject;
  currentDashboardState: DashboardState;
  dashboardCapabilities: DashboardAppCapabilities;
  dashboardSessionStorage: DashboardSessionStorage;
}

export const showPublicUrlSwitch = (anonymousUserCapabilities: Capabilities) => {
  if (!anonymousUserCapabilities.dashboard) return false;

  const dashboard = anonymousUserCapabilities.dashboard as unknown as DashboardAppCapabilities;

  return !!dashboard.show;
};

export function ShowShareModal({
  share,
  isDirty,
  timeRange,
  kibanaVersion,
  anchorElement,
  savedDashboard,
  dashboardCapabilities,
  currentDashboardState,
  dashboardSessionStorage,
}: ShowShareModalProps) {
  const EmbedUrlParamExtension = ({
    setParamValue,
  }: {
    setParamValue: (paramUpdate: { [key: string]: boolean }) => void;
  }): ReactElement => {
    const [urlParamsSelectedMap, seturlParamsSelectedMap] = useState<{ [key: string]: boolean }>({
      showFilterBar: true,
    });

    const checkboxes = [
      {
        id: dashboardUrlParams.showTopMenu,
        label: shareModalStrings.getTopMenuCheckbox(),
      },
      {
        id: dashboardUrlParams.showQueryInput,
        label: shareModalStrings.getQueryCheckbox(),
      },
      {
        id: dashboardUrlParams.showTimeFilter,
        label: shareModalStrings.getTimeFilterCheckbox(),
      },
      {
        id: showFilterBarId,
        label: shareModalStrings.getFilterBarCheckbox(),
      },
    ];

    const handleChange = (param: string): void => {
      const newSelectedMap = {
        ...urlParamsSelectedMap,
        [param]: !urlParamsSelectedMap[param],
      };

      const urlParamValues = {
        [dashboardUrlParams.showTopMenu]: newSelectedMap[dashboardUrlParams.showTopMenu],
        [dashboardUrlParams.showQueryInput]: newSelectedMap[dashboardUrlParams.showQueryInput],
        [dashboardUrlParams.showTimeFilter]: newSelectedMap[dashboardUrlParams.showTimeFilter],
        [dashboardUrlParams.hideFilterBar]: !newSelectedMap[showFilterBarId],
      };
      seturlParamsSelectedMap(newSelectedMap);
      setParamValue(urlParamValues);
    };

    return (
      <EuiCheckboxGroup
        options={checkboxes}
        idToSelectedMap={urlParamsSelectedMap}
        onChange={handleChange}
        legend={{
          children: shareModalStrings.getCheckboxLegend(),
        }}
        data-test-subj="embedUrlParamExtension"
      />
    );
  };

  let unsavedStateForLocator: Pick<
    DashboardAppLocatorParams,
    'options' | 'query' | 'savedQuery' | 'filters' | 'panels'
  > = {};
  const unsavedDashboardState = dashboardSessionStorage.getState(savedDashboard.id);
  if (unsavedDashboardState) {
    unsavedStateForLocator = {
      query: unsavedDashboardState.query,
      filters: unsavedDashboardState.filters,
      options: unsavedDashboardState.options,
      savedQuery: unsavedDashboardState.savedQuery,
      panels: unsavedDashboardState.panels
        ? convertPanelMapToSavedPanels(unsavedDashboardState.panels, kibanaVersion)
        : undefined,
    };
  }

  const locatorParams: DashboardAppLocatorParams = {
    dashboardId: savedDashboard.id,
    preserveSavedFilters: true,
    refreshInterval: undefined, // We don't share refresh interval externally
    viewMode: ViewMode.VIEW, // For share locators we always load the dashboard in view mode
    useHash: false,
    timeRange,
    ...unsavedStateForLocator,
  };

  share.toggleShareContextMenu({
    isDirty,
    anchorElement,
    allowEmbed: true,
    allowShortUrl: dashboardCapabilities.createShortUrl,
    shareableUrl: setStateToKbnUrl(
      '_a',
      stateToRawDashboardState({
        state: currentDashboardState,
        version: kibanaVersion,
      }),
      { useHash: false, storeInHashQuery: true },
      unhashUrl(window.location.href)
    ),
    objectId: savedDashboard.id,
    objectType: 'dashboard',
    sharingData: {
      title:
        savedDashboard.title ||
        i18n.translate('dashboard.share.defaultDashboardTitle', {
          defaultMessage: 'Dashboard [{date}]',
          values: { date: moment().toISOString(true) },
        }),
      locatorParams: {
        id: DASHBOARD_APP_LOCATOR,
        version: kibanaVersion,
        params: locatorParams,
      },
    },
    embedUrlParamExtensions: [
      {
        paramName: 'embed',
        component: EmbedUrlParamExtension,
      },
    ],
    showPublicUrlSwitch,
  });
}
