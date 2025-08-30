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
import type { ReactElement } from 'react';
import React, { useState } from 'react';
import {
  EuiButton,
  EuiCallOut,
  EuiCheckbox,
  EuiFlexGrid,
  EuiFlexItem,
  EuiFormFieldset,
  EuiText,
} from '@elastic/eui';
import type { Capabilities } from '@kbn/core/public';
import type { QueryState } from '@kbn/data-plugin/common';
import { DASHBOARD_APP_LOCATOR } from '@kbn/deeplinks-analytics';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { getStateFromKbnUrl, setStateToKbnUrl, unhashUrl } from '@kbn/kibana-utils-plugin/public';
import type { LocatorPublic } from '@kbn/share-plugin/common';

import type { DashboardLocatorParams } from '../../../../common';
import { getDashboardBackupService } from '../../../services/dashboard_backup_service';
import { dataService, shareService } from '../../../services/kibana_services';
import { getDashboardCapabilities } from '../../../utils/get_dashboard_capabilities';
import { DASHBOARD_STATE_STORAGE_KEY } from '../../../utils/urls';
import { shareModalStrings } from '../../_dashboard_app_strings';
import { dashboardUrlParams } from '../../dashboard_router';
import { AccessModeContainer } from '../../access_control';
import type { SaveDashboardReturn } from '../../../services/dashboard_content_management_service/types';

const showFilterBarId = 'showFilterBar';

export interface ShowShareModalProps {
  asExport?: boolean;
  isDirty: boolean;
  savedObjectId?: string;
  dashboardTitle?: string;
  anchorElement: HTMLElement;
  canSave: boolean;
  saveDashboard: () => Promise<SaveDashboardReturn | undefined>;
}

export const showPublicUrlSwitch = (anonymousUserCapabilities: Capabilities) => {
  if (!anonymousUserCapabilities.dashboard_v2) return false;

  const dashboard = anonymousUserCapabilities.dashboard_v2;

  return !!dashboard.show;
};

export function ShowShareModal({
  isDirty,
  asExport,
  anchorElement,
  savedObjectId,
  dashboardTitle,
  canSave,
  saveDashboard,
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
        id: dashboardUrlParams.showTimeFilter,
        label: shareModalStrings.getTimeFilterCheckbox(),
      },
      {
        id: dashboardUrlParams.showQueryInput,
        label: shareModalStrings.getQueryCheckbox(),
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
      <EuiFormFieldset legend={{ children: shareModalStrings.getCheckboxLegend() }}>
        <EuiFlexGrid columns={2} gutterSize="s" data-test-subj="embedUrlParamExtension">
          {checkboxes.map(({ id, label }) => (
            <EuiFlexItem key={id}>
              <EuiCheckbox
                id={id}
                label={label}
                checked={!!urlParamsSelectedMap[id]}
                onChange={() => handleChange(id)}
              />
            </EuiFlexItem>
          ))}
        </EuiFlexGrid>
      </EuiFormFieldset>
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

  const LinkCalloutBody = () => (
    <EuiText component="p" size="s">
      {hasPanelChanges
        ? allowShortUrl
          ? shareModalStrings.getDraftSharePanelChangesWarning()
          : shareModalStrings.getSnapshotShareWarning()
        : shareModalStrings.getDraftShareWarning('link')}
    </EuiText>
  );

  const EmbedCalloutBody = () => (
    <EuiText component="p" size="s">
      {hasPanelChanges
        ? shareModalStrings.getEmbedSharePanelChangesWarning()
        : shareModalStrings.getDraftShareWarning('embed')}
    </EuiText>
  );

  const DraftModalCallout = ({ type }: { type: string }) => {
    const [hasBeenSaved, setHasBeenSaved] = useState<boolean>(!isDirty);

    const handleSaveDashboard = async () => {
      const result = await saveDashboard();
      if (result && !result.error) {
        setHasBeenSaved(true);
      }
    };

    if (hasBeenSaved) {
      return null;
    }

    return (
      <EuiCallOut
        color="warning"
        iconType="info"
        data-test-subj="DashboardDraftModeCopyLinkCallOut"
        title={
          <FormattedMessage
            id="dashboard.share.shareModal.draftModeCallout.title"
            defaultMessage="Dashboard has unsaved changes"
          />
        }
      >
        {type === 'embed' ? <EmbedCalloutBody /> : <LinkCalloutBody />}
        <EuiButton
          color="warning"
          fill
          size="s"
          iconType="save"
          data-test-subj="DashboardDraftModeSaveButton"
          onClick={handleSaveDashboard}
        >
          <FormattedMessage
            id="dashboard.share.shareModal.draftModeCallout.saveButton"
            defaultMessage="Save"
          />
        </EuiButton>
      </EuiCallOut>
    );
  };

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
        defaultMessage: 'Share dashboard',
      }),
      config: {
        link: {
          draftModeCallOut: canSave && <DraftModalCallout type="link" />,
        },
        embed: {
          draftModeCallOut: canSave && <DraftModalCallout type="embed" />,
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
      accessModeContainer: <AccessModeContainer onChangeAccessMode={() => {}} />,
    },
    shareableUrlLocatorParams: {
      locator: shareService.url.locators.get(
        DASHBOARD_APP_LOCATOR
      ) as LocatorPublic<DashboardLocatorParams>,
      params: locatorParams,
    },
  });
}
