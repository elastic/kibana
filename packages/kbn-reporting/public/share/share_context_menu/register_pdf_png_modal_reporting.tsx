/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { toMountPoint } from '@kbn/react-kibana-mount';
import { ShareContext, ShareMenuItemV2, ShareMenuProvider } from '@kbn/share-plugin/public';
import React from 'react';
import { firstValueFrom } from 'rxjs';
import { ScreenshotExportOpts } from '@kbn/share-plugin/public/types';
import { ExportModalShareOpts, JobParamsProviderOptions, ReportingSharingData } from '.';
import { checkLicense } from '../../license_check';

const getJobParams = (opts: JobParamsProviderOptions, type: 'pngV2' | 'printablePdfV2') => () => {
  const {
    objectType,
    sharingData: { title, locatorParams },
    optimizedForPrinting,
  } = opts;

  const el = document.querySelector('[data-shared-items-container]');
  const { height, width } = el ? el.getBoundingClientRect() : { height: 768, width: 1024 };
  const dimensions = { height, width };
  const layoutId = optimizedForPrinting ? ('print' as const) : ('preserve_layout' as const);
  const layout = { id: layoutId, dimensions };
  const baseParams = { objectType, layout, title };

  if (type === 'printablePdfV2') {
    // multi locator for PDF V2
    return { ...baseParams, locatorParams: [locatorParams] };
  }
  // single locator for PNG V2
  return { ...baseParams, locatorParams };
};

/**
 * This is used by Dashboard and Visualize apps (sharing modal)
 */
export const reportingExportModalProvider = ({
  apiClient,
  license,
  application,
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

    const capabilityHasDashboardScreenshotReporting =
      application.capabilities.dashboard?.generateScreenshot === true;
    const capabilityHasVisualizeScreenshotReporting =
      application.capabilities.visualize?.generateScreenshot === true;

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

    const generateReportPDF = ({ intl, optimizedForPrinting = false }: ScreenshotExportOpts) => {
      const decoratedJobParams = apiClient.getDecoratedJobParams({
        ...getJobParams({ ...jobProviderOptions, optimizedForPrinting }, 'printablePdfV2')(),
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

    const generateExportUrlPDF = ({ optimizedForPrinting }: ScreenshotExportOpts) => {
      const jobParams = apiClient.getDecoratedJobParams(
        getJobParams({ ...jobProviderOptions, optimizedForPrinting }, 'printablePdfV2')()
      );
      const relativePathPDF = apiClient.getReportingPublicJobPath('printablePdfV2', jobParams);

      return new URL(relativePathPDF, window.location.href).toString();
    };

    const generateExportUrlPNG = () => {
      const jobParams = apiClient.getDecoratedJobParams(
        getJobParams(jobProviderOptions, 'pngV2')()
      );
      const relativePathPNG = apiClient.getReportingPublicJobPath('pngV2', jobParams);

      return new URL(relativePathPNG, window.location.href).toString();
    };

    const generateReportPNG = ({ intl }: ScreenshotExportOpts) => {
      const decoratedJobParams = apiClient.getDecoratedJobParams({
        ...getJobParams(jobProviderOptions, 'pngV2')(),
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
      generateExportUrl: generateExportUrlPDF,
      reportType: 'printablePdfV2',
      requiresSavedState,
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
      generateExportUrl: generateExportUrlPNG,
      reportType: 'pngV2',
      requiresSavedState,
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
