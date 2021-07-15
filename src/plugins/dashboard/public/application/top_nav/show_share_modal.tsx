/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Capabilities } from 'src/core/public';
import { EuiCheckboxGroup } from '@elastic/eui';
import React from 'react';
import { ReactElement, useState } from 'react';
import { DashboardSavedObject } from '../..';
import { setStateToKbnUrl, unhashUrl } from '../../services/kibana_utils';
import { SharePluginStart } from '../../services/share';
import { dashboardUrlParams } from '../dashboard_router';
import { shareModalStrings } from '../../dashboard_strings';
import { DashboardAppCapabilities, DashboardState } from '../../types';
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

  share.toggleShareContextMenu({
    isDirty,
    anchorElement,
    allowEmbed: true,
    allowShortUrl: dashboardCapabilities.createShortUrl,
    shareableUrl: setStateToKbnUrl(
      '_a',
      stateToRawDashboardState({ state: currentDashboardState, version: kibanaVersion }),
      { useHash: false, storeInHashQuery: true },
      unhashUrl(window.location.href)
    ),
    objectId: savedDashboard.id,
    objectType: 'dashboard',
    sharingData: {
      title: savedDashboard.title,
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
