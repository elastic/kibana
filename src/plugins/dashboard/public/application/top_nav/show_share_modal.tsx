/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { EuiCheckboxGroup } from '@elastic/eui';
import React from 'react';
import { ReactElement, useState } from 'react';
import { DashboardSavedObject } from '../..';
import { setStateToKbnUrl, unhashUrl } from '../../services/kibana_utils';
import { SharePluginStart } from '../../services/share';
import { dashboardUrlParams } from '../dashboard_router';
import { DashboardStateManager } from '../dashboard_state_manager';
import { shareModalStrings } from '../../dashboard_strings';
import { DashboardCapabilities } from '../types';

const showFilterBarId = 'showFilterBar';

interface ShowShareModalProps {
  share: SharePluginStart;
  anchorElement: HTMLElement;
  savedDashboard: DashboardSavedObject;
  dashboardCapabilities: DashboardCapabilities;
  dashboardStateManager: DashboardStateManager;
}

export function ShowShareModal({
  share,
  anchorElement,
  savedDashboard,
  dashboardCapabilities,
  dashboardStateManager,
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
    anchorElement,
    allowEmbed: true,
    allowShortUrl: !dashboardCapabilities.hideWriteControls || dashboardCapabilities.createShortUrl,
    shareableUrl: setStateToKbnUrl(
      '_a',
      dashboardStateManager.getAppState(),
      { useHash: false, storeInHashQuery: true },
      unhashUrl(window.location.href)
    ),
    objectId: savedDashboard.id,
    objectType: 'dashboard',
    sharingData: {
      title: savedDashboard.title,
    },
    isDirty: dashboardStateManager.getIsDirty(),
    embedUrlParamExtensions: [
      {
        paramName: 'embed',
        component: EmbedUrlParamExtension,
      },
    ],
  });
}
