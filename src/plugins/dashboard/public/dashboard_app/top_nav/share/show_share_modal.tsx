/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiCheckboxGroup } from '@elastic/eui';
import type { Capabilities } from '@kbn/core/public';
import { QueryState } from '@kbn/data-plugin/common';
import { DASHBOARD_APP_LOCATOR } from '@kbn/deeplinks-analytics';
import { ViewMode } from '@kbn/embeddable-plugin/public';
import { i18n } from '@kbn/i18n';
import { getStateFromKbnUrl, setStateToKbnUrl, unhashUrl } from '@kbn/kibana-utils-plugin/public';
import { omit } from 'lodash';
import moment from 'moment';
import React, { ReactElement, useState } from 'react';
import {
  convertPanelMapToSavedPanels,
  DashboardPanelMap,
} from '../../../../common';
import { DashboardLocatorParams } from '../../../dashboard_container';
import { pluginServices } from '../../../services/plugin_services';
import { dashboardUrlParams } from '../../dashboard_router';
import { shareModalStrings } from '../../_dashboard_app_strings';
import { PANELS_CONTROL_GROUP_KEY } from '../../../services/dashboard_backup/dashboard_backup_service';

const showFilterBarId = 'showFilterBar';

export interface ShowShareModalProps {
  isDirty: boolean;
  savedObjectId?: string;
  dashboardTitle?: string;
  anchorElement: HTMLElement;
  getPanelsState: () => DashboardPanelMap;
}

export const showPublicUrlSwitch = (anonymousUserCapabilities: Capabilities) => {
  if (!anonymousUserCapabilities.dashboard) return false;

  const dashboard = anonymousUserCapabilities.dashboard;

  return !!dashboard.show;
};

export function ShowShareModal({
  isDirty,
  anchorElement,
  savedObjectId,
  dashboardTitle,
  getPanelsState,
}: ShowShareModalProps) {
  const {
    dashboardCapabilities: { createShortUrl: allowShortUrl },
    dashboardBackup,
    data: {
      query: {
        timefilter: {
          timefilter: { getTime },
        },
      },
    },
    notifications,
    share: { toggleShareContextMenu },
  } = pluginServices.getServices();

  if (!toggleShareContextMenu) return; // TODO: Make this logic cleaner once share is an optional service

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

  let unsavedStateForLocator: DashboardLocatorParams = {};

  const { dashboardState: unsavedDashboardState, panels: panelModifications } =
    dashboardBackup.getState(savedObjectId) ?? {};

  const allUnsavedPanels = (() => {
    if (
      Object.keys(unsavedDashboardState?.panels ?? {}).length === 0 &&
      Object.keys(panelModifications ?? {}).length === 0
    ) {
      // if this dashboard has no modifications or unsaved panels return early. No overrides needed.
      return;
    }

    const latestPanels = getPanelsState();
    // apply modifications to panels.
    const modifiedPanels = panelModifications
      ? Object.entries(panelModifications).reduce((acc, [panelId, unsavedPanel]) => {
          if (unsavedPanel && latestPanels?.[panelId]) {
            acc[panelId] = {
              ...latestPanels[panelId],
              explicitInput: {
                ...latestPanels?.[panelId].explicitInput,
                ...unsavedPanel,
                id: panelId,
              },
            };
          }
          return acc;
        }, {} as DashboardPanelMap)
      : {};

    // The latest state of panels to share. This will overwrite panels from the saved object on Dashboard load.
    const allUnsavedPanelsMap = {
      ...latestPanels,
      ...modifiedPanels,
    };
    return convertPanelMapToSavedPanels(allUnsavedPanelsMap);
  })();

  if (unsavedDashboardState) {
    unsavedStateForLocator = {
      query: unsavedDashboardState.query,
      filters: unsavedDashboardState.filters,
      controlGroupState: panelModifications?.[
        PANELS_CONTROL_GROUP_KEY
      ] as DashboardLocatorParams['controlGroupState'],
      panels: allUnsavedPanels as DashboardLocatorParams['panels'],

      // options
      useMargins: unsavedDashboardState?.useMargins,
      syncColors: unsavedDashboardState?.syncColors,
      syncCursor: unsavedDashboardState?.syncCursor,
      syncTooltips: unsavedDashboardState?.syncTooltips,
      hidePanelTitles: unsavedDashboardState?.hidePanelTitles,
    };
  }

  const locatorParams: DashboardLocatorParams = {
    dashboardId: savedObjectId,
    preserveSavedFilters: true,
    refreshInterval: undefined, // We don't share refresh interval externally
    viewMode: ViewMode.VIEW, // For share locators we always load the dashboard in view mode
    useHash: false,
    timeRange: getTime(),
    ...unsavedStateForLocator,
  };

  let _g = getStateFromKbnUrl<QueryState>('_g', window.location.href);
  if (_g?.filters && _g.filters.length === 0) {
    _g = omit(_g, 'filters');
  }
  const baseUrl = setStateToKbnUrl('_g', _g, undefined, window.location.href);

  const shareableUrl = setStateToKbnUrl(
    '_a',
    unsavedStateForLocator,
    { useHash: false, storeInHashQuery: true },
    unhashUrl(baseUrl)
  );

  toggleShareContextMenu({
    isDirty,
    anchorElement,
    allowEmbed: true,
    allowShortUrl,
    shareableUrl,
    objectId: savedObjectId,
    objectType: 'dashboard',
    objectTypeMeta: {
      title: i18n.translate('dashboard.share.shareModal.title', {
        defaultMessage: 'Share this dashboard',
      }),
    },
    sharingData: {
      title:
        dashboardTitle ||
        i18n.translate('dashboard.share.defaultDashboardTitle', {
          defaultMessage: 'Dashboard [{date}]',
          values: { date: moment().toISOString(true) },
        }),
      locatorParams: {
        id: DASHBOARD_APP_LOCATOR,
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
    snapshotShareWarning: Boolean(unsavedDashboardState?.panels)
      ? shareModalStrings.getSnapshotShareWarning()
      : undefined,
    toasts: notifications.toasts,
  });
}
