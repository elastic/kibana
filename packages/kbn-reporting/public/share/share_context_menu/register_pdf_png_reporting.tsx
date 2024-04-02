/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import React from 'react';
import { ShareContext, ShareMenuProvider } from '@kbn/share-plugin/public';
import { downloadCSVs } from '@kbn/lens-plugin/public';
import { TableInspectorAdapter } from '@kbn/lens-plugin/public/editor_frame_service/types';
import { checkLicense } from '../../license_check';
import {
  ExportModalShareOpts,
  ExportPanelShareOpts,
  JobParamsProviderOptions,
  ReportingSharingData,
} from '.';
import { ReportingModalContent } from './reporting_modal_content_lazy';
import { ScreenCapturePanelContent } from './screen_capture_panel_content_lazy';
import { ReportingAPIClient } from '../../reporting_api_client';

const getJobParams =
  (
    apiClient: ReportingAPIClient,
    opts: JobParamsProviderOptions,
    type: 'png' | 'pngV2' | 'printablePdf' | 'printablePdfV2'
  ) =>
  () => {
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
      return { ...baseParams, locatorParams: [locatorParams] };
    } else if (type === 'pngV2') {
      // single locator for PNG V2
      return { ...baseParams, locatorParams };
    }

    // Relative URL must have URL prefix (Spaces ID prefix), but not server basePath
    // Replace hashes with original RISON values.
    const relativeUrl = opts.shareableUrl.replace(
      window.location.origin + apiClient.getServerBasePath(),
      ''
    );

    if (type === 'printablePdf') {
      // multi URL for PDF
      return { ...baseParams, relativeUrls: [relativeUrl] };
    }

    // single URL for PNG
    return { ...baseParams, relativeUrl };
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
    const isJobV2Params = ({
      sharingData: _sharingData,
    }: {
      sharingData: Record<string, unknown>;
    }) => _sharingData.locatorParams != null;

    const isV2Job = isJobV2Params(jobProviderOptions);
    const requiresSavedState = !isV2Job;

    const pngReportType = isV2Job ? 'pngV2' : 'png';

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
            reportType={pngReportType}
            objectId={objectId}
            requiresSavedState={requiresSavedState}
            getJobParams={getJobParams(apiClient, jobProviderOptions, pngReportType)}
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

    const pdfReportType = isV2Job ? 'printablePdfV2' : 'printablePdf';

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
            reportType={pdfReportType}
            objectId={objectId}
            requiresSavedState={requiresSavedState}
            layoutOption={objectType === 'dashboard' ? 'print' : undefined}
            getJobParams={getJobParams(apiClient, jobProviderOptions, pdfReportType)}
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

export const isJobV2Params = ({ sharingData }: { sharingData: Record<string, unknown> }): boolean =>
  sharingData.locatorParams != null;

export const reportingExportModalProvider = ({
  apiClient,
  toasts,
  uiSettings,
  license,
  application,
  usesUiCapabilities,
  theme,
  formatFactoryFn,
}: ExportModalShareOpts): ShareMenuProvider => {
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
    // for lens png pdf and csv are combined into one modal
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

    const jobProviderOptions: JobParamsProviderOptions = {
      shareableUrl: isDirty ? shareableUrl : shareableUrlForSavedObject ?? shareableUrl,
      objectType,
      sharingData,
    };

    const isV2Job = isJobV2Params(jobProviderOptions);
    const requiresSavedState = !isV2Job;
    const { title, activeData, columnsSorting } = sharingData as unknown as {
      title: string;
      activeData: TableInspectorAdapter;
      columnsSorting?: string[];
    };

    shareActions.push({
      shareMenuItem: {
        name: i18n.translate('reporting.shareContextMenu.ExportsButtonLabel', {
          defaultMessage: 'Export',
        }),
        toolTipContent: licenseToolTipContent,
        disabled: licenseDisabled || sharingData.reportingDisabled,
        ['data-test-subj']: 'imageExports',
      },
      panel: {
        id: 'reportingImageModal',
        title: i18n.translate('reporting.shareContextMenu.ReportsButtonLabel', {
          defaultMessage: 'Generate report',
        }),
        content: (
          <ReportingModalContent
            apiClient={apiClient}
            toasts={toasts}
            uiSettings={uiSettings}
            objectId={objectId}
            requiresSavedState={requiresSavedState}
            layoutOption={objectType === 'dashboard' ? 'print' : undefined}
            jobProviderOptions={jobProviderOptions}
            isDirty={isDirty}
            onClose={() => {
              onClose();
            }}
            theme={theme}
            objectType={objectType}
            downloadCsvFromLens={async () => {
              return await downloadCSVs({
                title,
                formatFactory: formatFactoryFn(),
                activeData,
                uiSettings,
                columnsSorting,
              });
            }}
          />
        ),
      },
    });
    return shareActions;
  };

  return {
    id: 'screenCaptureReports',
    getShareMenuItems,
  };
};
