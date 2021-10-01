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
import type { Capabilities } from 'src/core/public';
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

const showFilterBarId = 'showFilterBar';

interface ShowShareModalProps {
  isDirty: boolean;
  kibanaVersion: string;
  share: SharePluginStart;
  anchorElement: HTMLElement;
  savedDashboard: DashboardSavedObject;
  currentDashboardState: DashboardState;
  dashboardCapabilities: DashboardAppCapabilities;
  timeRange: TimeRange;
}

export const showPublicUrlSwitch = (anonymousUserCapabilities: Capabilities) => {
  if (!anonymousUserCapabilities.dashboard) return false;

  const dashboard = anonymousUserCapabilities.dashboard as unknown as DashboardAppCapabilities;

  return !!dashboard.show;
};

export function ShowShareModal({
  share,
  isDirty,
  kibanaVersion,
  anchorElement,
  savedDashboard,
  dashboardCapabilities,
  currentDashboardState,
  timeRange,
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

  const rawDashboardState = stateToRawDashboardState({
    state: currentDashboardState,
    version: kibanaVersion,
  });

  const locatorParams: DashboardAppLocatorParams = {
    dashboardId: savedDashboard.id,
    filters: rawDashboardState.filters,
    preserveSavedFilters: true,
    query: rawDashboardState.query,
    savedQuery: rawDashboardState.savedQuery,
    useHash: false,
    panels: rawDashboardState.panels,
    timeRange,
    viewMode: ViewMode.VIEW, // For share locators we always load the dashboard in view mode
    refreshInterval: undefined, // We don't share refresh interval externally
    options: rawDashboardState.options,
  };

  share.toggleShareContextMenu({
    isDirty,
    anchorElement,
    allowEmbed: true,
    allowShortUrl: dashboardCapabilities.createShortUrl,
    shareableUrl: setStateToKbnUrl(
      '_a',
      rawDashboardState,
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
