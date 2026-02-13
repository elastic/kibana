/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ReactElement } from 'react';
import React, { useState } from 'react';
import { EuiCheckbox, EuiFlexGrid, EuiFlexItem, EuiFormFieldset } from '@elastic/eui';
import type { Capabilities } from '@kbn/core/public';
import { DASHBOARD_APP_LOCATOR } from '@kbn/deeplinks-analytics';
import { i18n } from '@kbn/i18n';
import type { LocatorPublic } from '@kbn/share-plugin/common';

import type { SavedObjectAccessControl } from '@kbn/core-saved-objects-common';
import {
  AccessModeContainer,
  type AccessControlClient,
} from '@kbn/content-management-access-control-public';

import { DASHBOARD_SAVED_OBJECT_TYPE } from '@kbn/deeplinks-analytics/constants';
import type { DashboardLocatorParams } from '../../../../common';
import { shareService, coreServices, spacesService } from '../../../services/kibana_services';
import { getDashboardCapabilities } from '../../../utils/get_dashboard_capabilities';
import { shareModalStrings } from '../../_dashboard_app_strings';
import { dashboardUrlParams } from '../../dashboard_router';
import { buildDashboardShareOptions } from './share_options_utils';

const showFilterBarId = 'showFilterBar';

export interface ShowShareModalProps {
  isDirty: boolean;
  savedObjectId?: string;
  dashboardTitle?: string;
  canSave: boolean;
  accessControl?: Partial<SavedObjectAccessControl>;
  createdBy?: string;
  isManaged: boolean;
  accessControlClient: AccessControlClient;
  saveDashboard: () => Promise<void>;
  changeAccessMode: (accessMode: SavedObjectAccessControl['accessMode']) => Promise<void>;
}

export const showPublicUrlSwitch = (anonymousUserCapabilities: Capabilities) => {
  if (!anonymousUserCapabilities.dashboard_v2) return false;

  const dashboard = anonymousUserCapabilities.dashboard_v2;

  return !!dashboard.show;
};

export function ShowShareModal({
  isDirty,
  savedObjectId,
  dashboardTitle,
  canSave,
  accessControl,
  createdBy,
  isManaged,
  accessControlClient,
  saveDashboard,
  changeAccessMode,
}: ShowShareModalProps) {
  if (!shareService) return;

  const handleChangeAccessMode = async (accessMode: SavedObjectAccessControl['accessMode']) => {
    if (!savedObjectId) return;

    try {
      await changeAccessMode(accessMode);
      return shareModalStrings.accessModeUpdateSuccess;
    } catch (error) {
      return shareModalStrings.accessModeUpdateError;
    }
  };

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

  const { locatorParams, shareableUrl, allowShortUrl, title, hasPanelChanges } =
    buildDashboardShareOptions({
      objectId: savedObjectId,
      dashboardTitle,
    });

  const { showWriteControls } = getDashboardCapabilities();
  const showAccessContainer = savedObjectId && !isManaged && showWriteControls;

  shareService.toggleShareContextMenu({
    isDirty,
    allowShortUrl,
    shareableUrl,
    objectId: savedObjectId,
    objectType: 'dashboard',
    onSave: canSave ? saveDashboard : undefined,
    objectTypeMeta: {
      title: i18n.translate('dashboard.share.shareModal.title', {
        defaultMessage: 'Share dashboard',
      }),
      config: {
        link: {
          draftModeCallOut: {
            message: hasPanelChanges
              ? allowShortUrl
                ? shareModalStrings.getDraftSharePanelChangesWarning()
                : shareModalStrings.getSnapshotShareWarning()
              : shareModalStrings.getDraftShareWarning('link'),
            'data-test-subj': 'DashboardDraftModeCopyLinkCallOut',
          },
        },
        embed: {
          draftModeCallOut: {
            message: hasPanelChanges
              ? shareModalStrings.getEmbedSharePanelChangesWarning()
              : shareModalStrings.getDraftShareWarning('embed'),
            'data-test-subj': 'DashboardDraftModeEmbedCallOut',
          },
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
              draftModeCallOut: true,
            },
            imageReports: {
              draftModeCallOut: true,
            },
          },
        },
      },
    },
    sharingData: {
      title,
      locatorParams: {
        id: DASHBOARD_APP_LOCATOR,
        params: locatorParams,
      },
      accessModeContainer: showAccessContainer ? (
        <AccessModeContainer
          accessControl={accessControl}
          createdBy={createdBy}
          getActiveSpace={spacesService?.getActiveSpace}
          getCurrentUser={coreServices.userProfile.getCurrent}
          onChangeAccessMode={handleChangeAccessMode}
          accessControlClient={accessControlClient}
          contentTypeId={DASHBOARD_SAVED_OBJECT_TYPE}
        />
      ) : undefined,
    },
    shareableUrlLocatorParams: {
      locator: shareService.url.locators.get(
        DASHBOARD_APP_LOCATOR
      ) as LocatorPublic<DashboardLocatorParams>,
      params: { ...locatorParams, timeRange: locatorParams.time_range },
    },
  });
}
