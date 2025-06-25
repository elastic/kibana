/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { omit } from 'lodash';
import moment from 'moment';
import React, { ReactElement, useState } from 'react';

import { EuiCallOut, EuiCheckboxGroup } from '@elastic/eui';
import type { Capabilities } from '@kbn/core/public';
import { QueryState } from '@kbn/data-plugin/common';
import { DASHBOARD_APP_LOCATOR } from '@kbn/deeplinks-analytics';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { getStateFromKbnUrl, setStateToKbnUrl, unhashUrl } from '@kbn/kibana-utils-plugin/public';
import { LocatorPublic } from '@kbn/share-plugin/common';

import { DashboardLocatorParams } from '../../../../common';
import { getDashboardBackupService } from '../../../services/dashboard_backup_service';
import { dataService, shareService } from '../../../services/kibana_services';
import { getDashboardCapabilities } from '../../../utils/get_dashboard_capabilities';
import { DASHBOARD_STATE_STORAGE_KEY } from '../../../utils/urls';
import { shareModalStrings } from '../../_dashboard_app_strings';
import { dashboardUrlParams } from '../../dashboard_router';

const showFilterBarId = 'showFilterBar';

export interface ShowShareModalProps {
  asExport?: boolean;
  isDirty: boolean;
  savedObjectId?: string;
  dashboardTitle?: string;
  anchorElement: HTMLElement;
}

export const showPublicUrlSwitch = (anonymousUserCapabilities: Capabilities) => {
  if (!anonymousUserCapabilities.dashboard) return false;

  const dashboard = anonymousUserCapabilities.dashboard;

  return !!dashboard.show;
};

export function ShowShareModal({
  isDirty,
  asExport,
  anchorElement,
  savedObjectId,
  dashboardTitle,
}: ShowShareModalProps) {
  if (!shareService) return;

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

  const unsavedDashboardState =
    getDashboardBackupService().getState(savedObjectId) ?? ({} as DashboardLocatorParams);

  const hasPanelChanges = unsavedDashboardState.panels !== undefined;

  const unsavedDashboardStateForLocator: DashboardLocatorParams = {
    ...unsavedDashboardState,
    controlGroupInput:
      unsavedDashboardState.controlGroupInput as DashboardLocatorParams['controlGroupInput'],
    references: unsavedDashboardState.references as DashboardLocatorParams['references'],
  };

  const locatorParams: DashboardLocatorParams = {
    dashboardId: savedObjectId,
    preserveSavedFilters: true,
    refreshInterval: undefined, // We don't share refresh interval externally
    viewMode: 'view', // For share locators we always load the dashboard in view mode
    useHash: false,
    timeRange: dataService.query.timefilter.timefilter.getTime(),
    ...unsavedDashboardStateForLocator,
  };

  let _g = getStateFromKbnUrl<QueryState>('_g', window.location.href);
  if (_g?.filters && _g.filters.length === 0) {
    _g = omit(_g, 'filters');
  }
  const baseUrl = setStateToKbnUrl('_g', _g, undefined, window.location.href);

  const shareableUrl = setStateToKbnUrl(
    DASHBOARD_STATE_STORAGE_KEY,
    unsavedDashboardStateForLocator,
    { useHash: false, storeInHashQuery: true },
    unhashUrl(baseUrl)
  );

  const allowShortUrl = getDashboardCapabilities().createShortUrl;

  shareService.toggleShareContextMenu({
    isDirty,
    anchorElement,
    allowShortUrl,
    shareableUrl,
    asExport,
    objectId: savedObjectId,
    objectType: 'dashboard',
    objectTypeMeta: {
      title: i18n.translate('dashboard.share.shareModal.title', {
        defaultMessage: 'Share this dashboard',
      }),
      config: {
        link: {
          draftModeCallOut: (
            <EuiCallOut
              color="warning"
              data-test-subj="DashboardDraftModeCopyLinkCallOut"
              title={
                <FormattedMessage
                  id="dashboard.share.shareModal.draftModeCallout.title"
                  defaultMessage="Unsaved changes"
                />
              }
            >
              {Boolean(unsavedDashboardState?.panels)
                ? allowShortUrl
                  ? shareModalStrings.getDraftSharePanelChangesWarning()
                  : shareModalStrings.getSnapshotShareWarning()
                : shareModalStrings.getDraftShareWarning('link')}
            </EuiCallOut>
          ),
        },
        embed: {
          draftModeCallOut: (
            <EuiCallOut
              color="warning"
              data-test-subj="DashboardDraftModeEmbedCallOut"
              title={
                <FormattedMessage
                  id="dashboard.share.shareModal.draftModeCallout.title"
                  defaultMessage="Unsaved changes"
                />
              }
            >
              {hasPanelChanges
                ? shareModalStrings.getEmbedSharePanelChangesWarning()
                : shareModalStrings.getDraftShareWarning('embed')}
            </EuiCallOut>
          ),
          embedUrlParamExtensions: [
            {
              paramName: 'embed',
              component: EmbedUrlParamExtension,
            },
          ],
          computeAnonymousCapabilities: showPublicUrlSwitch,
        },
        integration: {
          export: {
            pdfReports: {
              draftModeCallOut: (
                <EuiCallOut
                  color="warning"
                  iconType="warning"
                  title={
                    <FormattedMessage
                      id="dashboard.exports.pdfReports.warning.title"
                      defaultMessage="Unsaved changes"
                    />
                  }
                >
                  <FormattedMessage
                    id="dashboard.exports.pdfReports.postURLWatcherMessage.unsavedChanges"
                    defaultMessage="URL may change if you upgrade Kibana."
                  />
                </EuiCallOut>
              ),
            },
            imageReports: {
              draftModeCallOut: (
                <EuiCallOut
                  color="warning"
                  iconType="warning"
                  title={
                    <FormattedMessage
                      id="dashboard.exports.imageReports.warning.title"
                      defaultMessage="Unsaved changes"
                    />
                  }
                >
                  <FormattedMessage
                    id="dashboard.exports.imageReports.postURLWatcherMessage.unsavedChanges"
                    defaultMessage="URL may change if you upgrade Kibana."
                  />
                </EuiCallOut>
              ),
            },
          },
        },
      },
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
    shareableUrlLocatorParams: {
      locator: shareService.url.locators.get(
        DASHBOARD_APP_LOCATOR
      ) as LocatorPublic<DashboardLocatorParams>,
      params: locatorParams,
    },
  });
}
