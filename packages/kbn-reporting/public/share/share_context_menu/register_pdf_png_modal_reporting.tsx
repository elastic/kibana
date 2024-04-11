/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import React from 'react';
import { ShareContext, ShareMenuItem, ShareMenuProvider } from '@kbn/share-plugin/public';
import { FormattedMessage, InjectedIntl } from '@kbn/i18n-react';
import { toMountPoint } from '@kbn/react-kibana-mount';
import { checkLicense } from '../../license_check';
import {
  ExportModalShareOpts,
  ExportPanelShareOpts,
  JobParamsProviderOptions,
  ReportingSharingData,
} from '.';
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
  toasts,
  uiSettings,
  license,
  application,
  usesUiCapabilities,
  theme,
}: ExportPanelShareOpts & { intl: InjectedIntl }): ShareMenuProvider => {
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
    const shareActions: ShareMenuItem[] = [];

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
            toasts={toasts}
            uiSettings={uiSettings}
            reportType={'pngV2'}
            objectId={objectId}
            requiresSavedState={requiresSavedState}
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
            requiresSavedState={requiresSavedState}
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

export const reportingExportModalProvider = ({
  apiClient,
  license,
  application,
  usesUiCapabilities,
  theme,
  i18n: i18nStart,
  intl,
}: ExportModalShareOpts & { intl: InjectedIntl }): ShareMenuProvider => {
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
    const shareActions: ShareMenuItem[] = [];

    const jobProviderOptions: JobParamsProviderOptions = {
      shareableUrl: isDirty ? shareableUrl : shareableUrlForSavedObject ?? shareableUrl,
      objectType,
      sharingData,
    };

    const requiresSavedState = sharingData.locatorParams === null;

    const relativePathPDF = apiClient.getReportingPublicJobPath(
      'printablePdfV2',
      apiClient.getDecoratedJobParams(getJobParams(jobProviderOptions, 'printablePdfV2')())
    );

    const relativePathPNG = apiClient.getReportingPublicJobPath(
      'pngV2',
      apiClient.getDecoratedJobParams(getJobParams(jobProviderOptions, 'pngV2')())
    );

    const generateReportPDF = () => {
      const el = document.querySelector('[data-shared-items-container]');
      const { height, width } = el ? el.getBoundingClientRect() : { height: 768, width: 1024 };
      const dimensions = { height, width };

      const decoratedJobParams = apiClient.getDecoratedJobParams({
        ...getJobParams(jobProviderOptions, 'printablePdfV2')(),
        layout: { id: 'preserve_layout', dimensions },
        objectType,
        title: sharingData.title,
      });

      return apiClient
        .createReportingJob('printablePdfV2', decoratedJobParams)
        .then(() => {
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
              { theme, i18n: i18nStart }
            ),
            'data-test-subj': 'queueReportSuccess',
          });
          if (onClose) {
            onClose();
          }
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

    const generateReportPDFForPrinting = () => {
      const el = document.querySelector('[data-shared-items-container]');
      const { height, width } = el ? el.getBoundingClientRect() : { height: 768, width: 1024 };
      const dimensions = { height, width };

      const decoratedJobParams = apiClient.getDecoratedJobParams({
        ...getJobParams(jobProviderOptions, 'printablePdfV2')(),
        layout: { id: 'print', dimensions },
        objectType,
        title: sharingData.title,
      });
      return apiClient
        .createReportingJob('printablePdfV2', decoratedJobParams)
        .then(() => {
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
              { theme, i18n: i18nStart }
            ),
            'data-test-subj': 'queueReportSuccess',
          });
          if (onClose) {
            onClose();
          }
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

    const generateReportPNG = () => {
      const el = document.querySelector('[data-shared-items-container]');
      const { height, width } = el ? el.getBoundingClientRect() : { height: 768, width: 1024 };
      const dimensions = { height, width };

      const decoratedJobParams = apiClient.getDecoratedJobParams({
        ...getJobParams(jobProviderOptions, 'pngV2')(),
        layout: { id: 'preserve_layout', dimensions },
        objectType,
        title: sharingData.title,
      });
      return apiClient
        .createReportingJob('pngV2', decoratedJobParams)
        .then(() => {
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
              { theme, i18n: i18nStart }
            ),
            'data-test-subj': 'queueReportSuccess',
          });
          if (onClose) {
            onClose();
          }
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
      generateReportForPrinting: generateReportPDFForPrinting,
      generateReport: generateReportPDF,
      reportType: 'printablePdfV2',
      requiresSavedState,
      helpText: (
        <FormattedMessage
          id="reporting.printablePdfV2.helpText"
          defaultMessage="Exports can take a few minutes to generate."
        />
      ),
      generateReportButton: (
        <FormattedMessage
          id="reporting.printablePdfV2.generateButtonLabel"
          defaultMessage="Generate export"
        />
      ),
      layoutOption: objectType === 'dashboard' ? ('print' as const) : undefined,
      theme,
      renderLayoutOptionSwitch: objectType === 'dashboard',
      renderCopyURLButton: true,
      absoluteUrl: new URL(relativePathPDF, window.location.href).toString(),
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
      // avoids a bug where for printing toggled to on for PDF and then radio is selected for PNG
      generateReportForPrinting: generateReportPNG,
      generateReport: generateReportPNG,
      reportType: 'pngV2',
      requiresSavedState,
      helpText: (
        <FormattedMessage
          id="reporting.pngV2.helpText"
          defaultMessage="Exports can take a few minutes to generate."
        />
      ),
      generateReportButton: (
        <FormattedMessage
          id="reporting.pngV2.generateButtonLabel"
          defaultMessage="Generate export"
        />
      ),
      layoutOption: objectType === 'dashboard' ? ('print' as const) : undefined,
      renderCopyURLButton: true,
      absoluteUrl: new URL(relativePathPNG, window.location.href).toString(),
    });

    return shareActions;
  };

  return {
    id: 'modalImageReports',
    getShareMenuItems,
  };
};
