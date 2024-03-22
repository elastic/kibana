/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { ShareContext, ShareMenuProvider } from '@kbn/share-plugin/public';
import React from 'react';
import { LocatorParams } from '@kbn/reporting-common/url';
import { ExportPanelShareOpts, JobParamsProviderOptions, ReportingSharingData } from '.';
import { checkLicense } from '../..';
import { ScreenCapturePanelContent } from './screen_capture_panel_content_lazy';

const getJobParams = (opts: JobParamsProviderOptions, type: 'pngV2' | 'printablePdfV2') => () => {
  const {
    objectType,
    sharingData: { title, layout, locatorParams },
  } = opts;

  const baseParams = {
    objectType,
    layout,
    title,
  };

  if (type === 'printablePdfV2') {
    // multi locator for PDF V2
    return { ...baseParams, locatorParams: [locatorParams as LocatorParams] };
  }

  // single locator for PNG V2
  return { ...baseParams, locatorParams: locatorParams as LocatorParams };
};

export const reportingScreenshotShareProvider = ({
  apiClient,
  toasts,
  uiSettings,
  license,
  application,
  usesUiCapabilities,
  theme,
}: ExportPanelShareOpts): ShareMenuProvider => {
  const getShareMenuItems = ({
    objectType,
    objectId,
    isDirty,
    onClose,
    shareableUrl,
    shareableUrlForSavedObject,
    ...shareOpts
  }: ShareContext) => {
    const { enableLinks, showLinks, message } = checkLicense(license.check('reporting', 'gold'));
    const licenseToolTipContent = message;
    const licenseHasScreenshotReporting = showLinks;
    const licenseDisabled = !enableLinks;

    let capabilityHasDashboardScreenshotReporting = false;
    let capabilityHasVisualizeScreenshotReporting = false;
    if (usesUiCapabilities) {
      capabilityHasDashboardScreenshotReporting =
        application.capabilities.dashboard?.generateScreenshot === true;
      capabilityHasVisualizeScreenshotReporting =
        application.capabilities.visualize?.generateScreenshot === true;
    } else {
      // deprecated
      capabilityHasDashboardScreenshotReporting = true;
      capabilityHasVisualizeScreenshotReporting = true;
    }

    if (!licenseHasScreenshotReporting) {
      return [];
    }
    const isSupportedType = ['dashboard', 'visualization', 'lens'].includes(objectType);

    if (!isSupportedType) {
      return [];
    }

    if (objectType === 'dashboard' && !capabilityHasDashboardScreenshotReporting) {
      return [];
    }

    if (
      isSupportedType &&
      !capabilityHasVisualizeScreenshotReporting &&
      !capabilityHasDashboardScreenshotReporting
    ) {
      return [];
    }

    const { sharingData } = shareOpts as unknown as { sharingData: ReportingSharingData };
    const shareActions = [];

    const pngPanelTitle = i18n.translate('reporting.share.contextMenu.pngReportsButtonLabel', {
      defaultMessage: 'PNG Reports',
    });

    const jobProviderOptions: JobParamsProviderOptions = {
      shareableUrl: isDirty ? shareableUrl : shareableUrlForSavedObject ?? shareableUrl,
      objectType,
      sharingData,
    };
    const panelPng = {
      shareMenuItem: {
        name: pngPanelTitle,
        icon: 'document',
        toolTipContent: licenseToolTipContent,
        disabled: licenseDisabled || sharingData.reportingDisabled,
        ['data-test-subj']: 'PNGReports',
        sortOrder: 10,
      },
      panel: {
        id: 'reportingPngPanel',
        title: pngPanelTitle,
        content: (
          <ScreenCapturePanelContent
            apiClient={apiClient}
            toasts={toasts}
            uiSettings={uiSettings}
            reportType={'pngV2'}
            objectId={objectId}
            requiresSavedState={false}
            getJobParams={getJobParams(jobProviderOptions, 'pngV2')}
            isDirty={isDirty}
            onClose={onClose}
            theme={theme}
          />
        ),
      },
    };

    const pdfPanelTitle = i18n.translate('reporting.share.contextMenu.pdfReportsButtonLabel', {
      defaultMessage: 'PDF Reports',
    });

    const panelPdf = {
      shareMenuItem: {
        name: pdfPanelTitle,
        icon: 'document',
        toolTipContent: licenseToolTipContent,
        disabled: licenseDisabled || sharingData.reportingDisabled,
        ['data-test-subj']: 'PDFReports',
        sortOrder: 10,
      },
      panel: {
        id: 'reportingPdfPanel',
        title: pdfPanelTitle,
        content: (
          <ScreenCapturePanelContent
            apiClient={apiClient}
            toasts={toasts}
            uiSettings={uiSettings}
            reportType={'printablePdfV2'}
            objectId={objectId}
            requiresSavedState={false}
            layoutOption={objectType === 'dashboard' ? 'print' : undefined}
            getJobParams={getJobParams(jobProviderOptions, 'printablePdfV2')}
            isDirty={isDirty}
            onClose={onClose}
            theme={theme}
          />
        ),
      },
    };

    shareActions.push(panelPng);
    shareActions.push(panelPdf);
    return shareActions;
  };

  return {
    id: 'screenCaptureReports',
    getShareMenuItems,
  };
};
