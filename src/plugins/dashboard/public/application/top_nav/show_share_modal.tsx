/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiCheckboxGroup } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { SerializableRecord } from '@kbn/utility-types';
import moment from 'moment';
import React, { ReactElement, useState } from 'react';
import type { Capabilities } from 'src/core/public';
import { DashboardSavedObject } from '../..';
import { SavedDashboardPanel } from '../../../common/types';
import { shareModalStrings } from '../../dashboard_strings';
import { DashboardAppLocatorParams, DASHBOARD_APP_LOCATOR } from '../../locator';
import { TimeRange } from '../../services/data';
import { setStateToKbnUrl, unhashUrl } from '../../services/kibana_utils';
import { SharePluginStart } from '../../services/share';
import { DashboardAppCapabilities, DashboardOptions, DashboardState } from '../../types';
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

  const dashboard = (anonymousUserCapabilities.dashboard as unknown) as DashboardAppCapabilities;

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
    ...rawDashboardState,
    forwardStateToHistory: true,
    options: rawDashboardState.options as SerializableRecord & DashboardOptions,
    panels: rawDashboardState.panels as SerializableRecord & SavedDashboardPanel[],
    timeRange,
    refreshInterval: undefined,
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
