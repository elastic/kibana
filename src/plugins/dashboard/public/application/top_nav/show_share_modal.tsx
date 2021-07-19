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
import type { SerializableRecord } from '@kbn/utility-types';
import { DashboardSavedObject } from '../..';
import { SharePluginStart } from '../../services/share';
import { dashboardUrlParams } from '../dashboard_router';
import { shareModalStrings } from '../../dashboard_strings';
import { DashboardAppCapabilities, DashboardPanelMap, DashboardState } from '../../types';
import { DashboardShareLocator } from '../../locator';

const showFilterBarId = 'showFilterBar';

interface ShowShareModalProps {
  isDirty: boolean;
  kibanaVersion: string;
  share: SharePluginStart;
  anchorElement: HTMLElement;
  savedDashboard: DashboardSavedObject;
  currentDashboardState: DashboardState;
  dashboardCapabilities: DashboardAppCapabilities;
  shareLocator: DashboardShareLocator;
}

export const showPublicUrlSwitch = (anonymousUserCapabilities: Capabilities) => {
  if (!anonymousUserCapabilities.dashboard) return false;

  const dashboard = (anonymousUserCapabilities.dashboard as unknown) as DashboardAppCapabilities;

  return !!dashboard.show;
};

export function ShowShareModal({
  share,
  shareLocator,
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

  const params = {
    ...currentDashboardState,
    options: { ...currentDashboardState.options },
    // TODO: why is this necessary?  also seems like everyone has to do this.
    panels: { ...currentDashboardState.panels } as DashboardPanelMap & SerializableRecord,
    version: kibanaVersion,
  };

  shareLocator
    .getRedirectUrl(params)
    .then((url) => {
      share.toggleShareContextMenu({
        isDirty,
        anchorElement,
        allowEmbed: true,
        allowShortUrl: dashboardCapabilities.createShortUrl,
        shareableUrl: url,
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
    })
    .catch((err) => {
      // eslint-disable-next-line no-console
      console.error(err);
    });
}
