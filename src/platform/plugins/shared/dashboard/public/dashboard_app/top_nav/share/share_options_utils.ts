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
import { i18n } from '@kbn/i18n';
import type { QueryState } from '@kbn/data-plugin/common';
import { DASHBOARD_APP_LOCATOR } from '@kbn/deeplinks-analytics';
import { getStateFromKbnUrl, setStateToKbnUrl, unhashUrl } from '@kbn/kibana-utils-plugin/public';
import type { LocatorPublic } from '@kbn/share-plugin/common';
import { topNavStrings } from '../../_dashboard_app_strings';
import type { DashboardLocatorParams } from '../../../../common';
import { getDashboardBackupService } from '../../../services/dashboard_backup_service';
import { dataService, shareService } from '../../../services/kibana_services';
import { getDashboardCapabilities } from '../../../utils/get_dashboard_capabilities';
import { DASHBOARD_STATE_STORAGE_KEY } from '../../../utils/urls';

/**
 * Builds common share options used by both the share modal and export items.
 */
export function buildDashboardShareOptions({
  objectId,
  dashboardTitle,
}: {
  objectId?: string;
  dashboardTitle?: string;
}): {
  locatorParams: DashboardLocatorParams;
  shareableUrl: string;
  allowShortUrl: boolean;
  title: string;
  hasPanelChanges: boolean;
} {
  const unsavedDashboardState =
    getDashboardBackupService().getState(objectId) ?? ({} as DashboardLocatorParams);

  const hasPanelChanges = unsavedDashboardState.panels !== undefined;

  const unsavedDashboardStateForLocator: DashboardLocatorParams = {
    ...unsavedDashboardState,
  };

  const locatorParams: DashboardLocatorParams = {
    dashboardId: objectId,
    preserveSavedFilters: true,
    refresh_interval: undefined, // We don't share refresh interval externally
    viewMode: 'view', // For share locators we always load the dashboard in view mode
    useHash: false,
    time_range: dataService.query.timefilter.timefilter.getTime(),
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

  const { createShortUrl } = getDashboardCapabilities();

  const title =
    dashboardTitle ||
    i18n.translate('dashboard.share.defaultDashboardTitle', {
      defaultMessage: 'Dashboard [{date}]',
      values: { date: moment().toISOString(true) },
    });

  return {
    locatorParams,
    shareableUrl,
    allowShortUrl: createShortUrl,
    title,
    hasPanelChanges,
  };
}

/**
 * Returns the objectTypeMeta config for export integrations.
 */
export function getExportObjectTypeMeta() {
  return {
    title: i18n.translate('dashboard.share.shareModal.title', {
      defaultMessage: 'Share dashboard',
    }),
    config: {
      integration: {
        export: {
          pdfReports: { draftModeCallOut: true },
          imageReports: { draftModeCallOut: true },
        },
      },
    },
  };
}

/**
 * Builds sharingData for export operations.
 */
export function buildExportSharingData(title: string, locatorParams: DashboardLocatorParams) {
  return {
    title,
    locatorParams: {
      id: DASHBOARD_APP_LOCATOR,
      params: locatorParams,
    },
  };
}

/**
 * Builds shareableUrlLocatorParams for export operations.
 */
export function buildShareableUrlLocatorParams(locatorParams: DashboardLocatorParams) {
  return {
    locator: shareService?.url.locators.get(
      DASHBOARD_APP_LOCATOR
    ) as LocatorPublic<DashboardLocatorParams>,
    params: { ...locatorParams, timeRange: locatorParams.time_range },
  };
}

export const mapExportIntegrationToMetaData = (intgrationId: string) => {
  switch (intgrationId) {
    case 'pdfReports':
      return {
        label: topNavStrings.export.pdfLabel,
        testId: 'exportMenuItem-PDF',
        iconType: 'document',
        order: 1,
      };
    case 'imageReports':
      return {
        label: topNavStrings.export.pngLabel,
        testId: 'exportMenuItem-PNG',
        iconType: 'image',
        order: 2,
      };
    case 'scheduledReports':
      return {
        label: topNavStrings.export.scheduleExportLabel,
        iconType: 'calendar',
        order: 3,
        separator: 'above' as const,
      };
    default:
      return {
        label: intgrationId,
        iconType: undefined,
        testId: `exportMenuItem-${intgrationId}`,
        order: 100,
      };
  }
};
