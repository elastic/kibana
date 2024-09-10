/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import { FormattedMessage, InjectedIntl } from '@kbn/i18n-react';
import { toMountPoint } from '@kbn/react-kibana-mount';
import {
  ShareContext,
  ShareMenuItemLegacy,
  ShareMenuItemV2,
  ShareMenuProvider,
} from '@kbn/share-plugin/public';
import React from 'react';
import { firstValueFrom } from 'rxjs';
import {
  ExportModalShareOpts,
  ExportPanelShareOpts,
  JobParamsProviderOptions,
  ReportingSharingData,
} from '.';
import { checkLicense } from '../../license_check';
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
    return { ...baseParams, locatorParams: [locatorParams] };
  }
  // single locator for PNG V2
  return { ...baseParams, locatorParams };
};

/**
 * This is used by Canvas
 */
export const reportingScreenshotShareProvider = ({
  apiClient,
  license,
  application,
  usesUiCapabilities,
  startServices$,
}: ExportPanelShareOpts): ShareMenuProvider => {
  const getShareMenuItemsLegacy = ({
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
    const shareActions: ShareMenuItemLegacy[] = [];

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
            startServices$={startServices$}
            reportType={'pngV2'}
            objectId={objectId}
            requiresSavedState={requiresSavedState}
            getJobParams={getJobParams(jobProviderOptions, 'pngV2')}
            isDirty={isDirty}
            onClose={onClose}
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
            startServices$={startServices$}
            reportType={'printablePdfV2'}
            objectId={objectId}
            requiresSavedState={requiresSavedState}
            layoutOption={objectType === 'dashboard' ? 'print' : undefined}
            getJobParams={getJobParams(jobProviderOptions, 'printablePdfV2')}
            isDirty={isDirty}
            onClose={onClose}
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
    getShareMenuItemsLegacy,
  };
};

export const reportingExportModalProvider = ({
  apiClient,
  license,
  application,
  usesUiCapabilities,
  startServices$,
}: ExportModalShareOpts): ShareMenuProvider => {
  const getShareMenuItems = ({
    objectType,
    objectId,
    isDirty,
    onClose,
    shareableUrl,
    shareableUrlForSavedObject,
    toasts,
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
    const shareActions: ShareMenuItemV2[] = [];

    const jobProviderOptions: JobParamsProviderOptions = {
      shareableUrl: isDirty ? shareableUrl : shareableUrlForSavedObject ?? shareableUrl,
      objectType,
      sharingData,
    };

    const requiresSavedState = sharingData.locatorParams === null;

    const generateReportPDF = ({
      intl,
      optimizedForPrinting = false,
    }: {
      intl: InjectedIntl;
      optimizedForPrinting?: boolean;
    }) => {
      const el = document.querySelector('[data-shared-items-container]');
      const { height, width } = el ? el.getBoundingClientRect() : { height: 768, width: 1024 };
      const dimensions = { height, width };

      const decoratedJobParams = apiClient.getDecoratedJobParams({
        ...getJobParams(jobProviderOptions, 'printablePdfV2')(),
        layout: { id: optimizedForPrinting ? 'print' : 'preserve_layout', dimensions },
        objectType,
        title: sharingData.title,
      });

      return apiClient
        .createReportingJob('printablePdfV2', decoratedJobParams)
        .then(() => firstValueFrom(startServices$))
        .then(([startServices]) => {
          toasts.addSuccess({
            title: intl.formatMessage(
              {
                id: 'reporting.share.modalContent.successfullyQueuedReportNotificationTitle',
                defaultMessage: 'Queued report for {objectType}',
              },
              { objectType }
            ),
            text: toMountPoint(
              <FormattedMessage
                id="reporting.share.modalContent.successfullyQueuedReportNotificationDescription"
                defaultMessage="Track its progress in {path}."
                values={{
                  path: (
                    <a href={apiClient.getManagementLink()}>
                      <FormattedMessage
                        id="reporting.share.publicNotifier.reportLink.reportingSectionUrlLinkLabel"
                        defaultMessage="Stack Management &gt; Reporting"
                      />
                    </a>
                  ),
                }}
              />,
              startServices
            ),
            'data-test-subj': 'queueReportSuccess',
          });
        })
        .catch((error: any) => {
          toasts.addError(error, {
            title: intl.formatMessage({
              id: 'reporting.share.modalContent.notification.reportingErrorTitle',
              defaultMessage: 'Unable to create report',
            }),
            toastMessage: error.body?.message,
          });
        });
    };

    const generateReportPNG = ({ intl }: { intl: InjectedIntl }) => {
      const { layout: outerLayout } = getJobParams(jobProviderOptions, 'pngV2')();
      let dimensions = outerLayout?.dimensions;
      if (!dimensions) {
        const el = document.querySelector('[data-shared-items-container]');
        const { height, width } = el ? el.getBoundingClientRect() : { height: 768, width: 1024 };
        dimensions = { height, width };
      }
      const decoratedJobParams = apiClient.getDecoratedJobParams({
        ...getJobParams(jobProviderOptions, 'pngV2')(),
        layout: { id: 'preserve_layout', dimensions },
        objectType,
        title: sharingData.title,
      });
      return apiClient
        .createReportingJob('pngV2', decoratedJobParams)
        .then(() => firstValueFrom(startServices$))
        .then(([startServices]) => {
          toasts.addSuccess({
            title: intl.formatMessage(
              {
                id: 'reporting.share.modalContent.successfullyQueuedReportNotificationTitle',
                defaultMessage: 'Queued report for {objectType}',
              },
              { objectType }
            ),
            text: toMountPoint(
              <FormattedMessage
                id="reporting.share.modalContent.successfullyQueuedReportNotificationDescription"
                defaultMessage="Track its progress in {path}."
                values={{
                  path: (
                    <a href={apiClient.getManagementLink()}>
                      <FormattedMessage
                        id="reporting.share.publicNotifier.reportLink.reportingSectionUrlLinkLabel"
                        defaultMessage="Stack Management &gt; Reporting"
                      />
                    </a>
                  ),
                }}
              />,
              startServices
            ),
            'data-test-subj': 'queueReportSuccess',
          });
        })
        .catch((error: any) => {
          toasts.addError(error, {
            title: intl.formatMessage({
              id: 'reporting.share.modalContent.notification.reportingErrorTitle',
              defaultMessage: 'Unable to create report',
            }),
            toastMessage: error.body?.message,
          });
        });
    };

    shareActions.push({
      shareMenuItem: {
        name: i18n.translate('reporting.shareContextMenu.ExportsButtonLabel', {
          defaultMessage: 'PDF',
        }),
        toolTipContent: licenseToolTipContent,
        disabled: licenseDisabled || sharingData.reportingDisabled,
        ['data-test-subj']: 'imageExports',
      },
      label: 'PDF' as const,
      generateExport: generateReportPDF,
      generateExportUrl: ({ optimizedForPrinting }) => {
        const relativePathPDF = apiClient.getReportingPublicJobPath(
          'printablePdfV2',
          apiClient.getDecoratedJobParams(getJobParams(jobProviderOptions, 'printablePdfV2')())
        );

        return new URL(relativePathPDF, window.location.href).toString();
      },
      reportType: 'printablePdfV2',
      requiresSavedState,
      helpText: (
        <FormattedMessage
          id="reporting.printablePdfV2.helpText"
          defaultMessage="Select the file type you would like to export for this visualization."
        />
      ),
      generateExportButton: (
        <FormattedMessage
          id="reporting.printablePdfV2.generateButtonLabel"
          defaultMessage="Export file"
        />
      ),
      layoutOption: objectType === 'dashboard' ? ('print' as const) : undefined,
      renderLayoutOptionSwitch: objectType === 'dashboard',
      renderCopyURLButton: true,
    });

    shareActions.push({
      shareMenuItem: {
        name: i18n.translate('reporting.shareContextMenu.ExportsButtonLabelPNG', {
          defaultMessage: 'PNG export',
        }),
        toolTipContent: licenseToolTipContent,
        disabled: licenseDisabled || sharingData.reportingDisabled,
        ['data-test-subj']: 'imageExports',
      },
      label: 'PNG' as const,
      generateExport: generateReportPNG,
      generateExportUrl: () => {
        const relativePathPNG = apiClient.getReportingPublicJobPath(
          'pngV2',
          apiClient.getDecoratedJobParams(getJobParams(jobProviderOptions, 'pngV2')())
        );

        return new URL(relativePathPNG, window.location.href).toString();
      },
      reportType: 'pngV2',
      requiresSavedState,
      helpText: (
        <FormattedMessage
          id="reporting.pngV2.helpText"
          defaultMessage="Select the file type you would like to export for this visualization."
        />
      ),
      generateExportButton: (
        <FormattedMessage id="reporting.pngV2.generateButtonLabel" defaultMessage="Export file" />
      ),
      layoutOption: objectType === 'dashboard' ? ('print' as const) : undefined,
      renderCopyURLButton: true,
    });

    return shareActions;
  };

  return {
    id: 'modalImageReports',
    getShareMenuItems,
  };
};
