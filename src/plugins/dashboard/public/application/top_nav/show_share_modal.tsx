/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { EuiCheckboxGroup } from '@elastic/eui';
import React from 'react';
import { ReactElement, useState } from 'react';
import { DashboardSavedObject } from '../..';
import { setStateToKbnUrl, unhashUrl } from '../../../../kibana_utils/public';
import { SharePluginStart } from '../../../../share/public';
import { dashboardUrlParams } from '../dashboard_router';
import { DashboardStateManager } from '../dashboard_state_manager';
import { shareModalStrings } from '../dashboard_strings';
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
        label: shareModalStrings.topMenuCheckbox(),
      },
      {
        id: dashboardUrlParams.showQueryInput,
        label: shareModalStrings.queryCheckbox(),
      },
      {
        id: dashboardUrlParams.showTimeFilter,
        label: shareModalStrings.timeFilterCheckbox(),
      },
      {
        id: showFilterBarId,
        label: shareModalStrings.filterBarCheckbox(),
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
          children: shareModalStrings.checkboxLegend(),
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
