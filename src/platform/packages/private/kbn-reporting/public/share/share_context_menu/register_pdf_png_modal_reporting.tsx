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
import { ShareContext } from '@kbn/share-plugin/public';
import React from 'react';
import { firstValueFrom } from 'rxjs';
import { ExportGenerationOpts, ExportShare } from '@kbn/share-plugin/public/types';
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

export const reportingPDFExportProvider = ({
  apiClient,
  startServices$,
}: ExportModalShareOpts): ExportShare => {
  const supportedObjectTypes = ['dashboard', 'visualization', 'lens'];

  const getShareMenuItems = ({
    objectType,
    objectId,
    isDirty,
    onClose,
    shareableUrl,
    shareableUrlForSavedObject,
    ...shareOpts
  }: ShareContext): ReturnType<ExportShare['config']> => {
    const { sharingData } = shareOpts as unknown as { sharingData: ReportingSharingData };

    const jobProviderOptions: JobParamsProviderOptions = {
      shareableUrl: isDirty ? shareableUrl : shareableUrlForSavedObject ?? shareableUrl,
      objectType,
      sharingData,
    };

    const requiresSavedState = sharingData.locatorParams === null;

    const generateReportPDF = ({ intl, optimizedForPrinting = false }: ExportGenerationOpts) => {
      const decoratedJobParams = apiClient.getDecoratedJobParams({
        ...getJobParams({ ...jobProviderOptions, optimizedForPrinting }, 'printablePdfV2')(),
      });

      return firstValueFrom(startServices$).then(([startServices]) => {
        const {
          notifications: { toasts },
          rendering,
        } = startServices;
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
                rendering
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
      });
    };

    const generateExportUrlPDF = ({ optimizedForPrinting }: ExportGenerationOpts) => {
      const jobParams = apiClient.getDecoratedJobParams(
        getJobParams({ ...jobProviderOptions, optimizedForPrinting }, 'printablePdfV2')()
      );
      const relativePathPDF = apiClient.getReportingPublicJobPath('printablePdfV2', jobParams);

      return new URL(relativePathPDF, window.location.href).toString();
    };

    return {
      name: i18n.translate('reporting.shareContextMenu.ExportsButtonLabel', {
        defaultMessage: 'PDF',
      }),
      icon: 'document',
      disabled: sharingData.reportingDisabled,
      label: 'PDF' as const,
      generateAssetExport: generateReportPDF,
      exportType: 'printablePdfV2',
      requiresSavedState,
      renderLayoutOptionSwitch: objectType === 'dashboard',
      copyAssetURIConfig: {
        headingText: i18n.translate(
          'reporting.shareContextMenu.copyUriModal.pdfExportCopyUriHeading',
          {
            defaultMessage: 'Post URL',
          }
        ),
        helpText: i18n.translate(
          'reporting.shareContextMenu.copyUriModal.pdfExportCopyUriHelpText',
          {
            defaultMessage:
              'Allows to generate selected file format programmatically outside Kibana or in Watcher.',
          }
        ),
        contentType: 'text',
        generateAssetURIValue: generateExportUrlPDF,
      },
    };
  };

  return {
    id: 'pdfReports',
    shareType: 'integration',
    groupId: 'export',
    config: getShareMenuItems,
    prerequisiteCheck({ license, capabilities, objectType }) {
      if (!license) {
        return false;
      }

      let isSupportedType: boolean;

      if (!(isSupportedType = supportedObjectTypes.includes(objectType))) {
        return false;
      }

      const { showLinks: licenseHasScreenshotReporting } = checkLicense(
        license.check('reporting', 'gold')
      );

      const capabilityHasDashboardScreenshotReporting =
        capabilities.dashboard_v2?.generateScreenshot === true;
      const capabilityHasVisualizeScreenshotReporting =
        capabilities.visualize_v2?.generateScreenshot === true;

      if (!licenseHasScreenshotReporting) {
        return false;
      }

      if (objectType === 'dashboard' && !capabilityHasDashboardScreenshotReporting) {
        return false;
      }

      if (
        isSupportedType &&
        !capabilityHasVisualizeScreenshotReporting &&
        !capabilityHasDashboardScreenshotReporting
      ) {
        return false;
      }

      return true;
    },
  };
};

export const reportingPNGExportProvider = ({
  apiClient,
  startServices$,
}: ExportModalShareOpts): ExportShare => {
  const supportedObjectTypes = ['dashboard', 'visualization', 'lens'];

  const getShareMenuItems = ({
    objectType,
    objectId,
    isDirty,
    onClose,
    shareableUrl,
    shareableUrlForSavedObject,
    ...shareOpts
  }: ShareContext): ReturnType<ExportShare['config']> => {
    const { sharingData } = shareOpts as unknown as { sharingData: ReportingSharingData };

    const jobProviderOptions: JobParamsProviderOptions = {
      shareableUrl: isDirty ? shareableUrl : shareableUrlForSavedObject ?? shareableUrl,
      objectType,
      sharingData,
    };

    const requiresSavedState = sharingData.locatorParams === null;

    const generateExportUrlPNG = () => {
      const jobParams = apiClient.getDecoratedJobParams(
        getJobParams(jobProviderOptions, 'pngV2')()
      );
      const relativePathPNG = apiClient.getReportingPublicJobPath('pngV2', jobParams);

      return new URL(relativePathPNG, window.location.href).toString();
    };

    const generateReportPNG = ({ intl }: ExportGenerationOpts) => {
      const decoratedJobParams = apiClient.getDecoratedJobParams({
        ...getJobParams(jobProviderOptions, 'pngV2')(),
      });

      return firstValueFrom(startServices$).then(([startServices]) => {
        const {
          notifications: { toasts },
          rendering,
        } = startServices;

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
                rendering
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
      });
    };

    return {
      name: i18n.translate('reporting.shareContextMenu.ExportsButtonLabelPNG', {
        defaultMessage: 'PNG export',
      }),
      icon: 'image',
      disabled: sharingData.reportingDisabled,
      label: 'PNG' as const,
      generateAssetExport: generateReportPNG,
      exportType: 'pngV2',
      requiresSavedState,
      copyAssetURIConfig: {
        headingText: i18n.translate(
          'reporting.shareContextMenu.copyUriModal.pngExportCopyUriHeading',
          {
            defaultMessage: 'Post URL',
          }
        ),
        helpText: i18n.translate(
          'reporting.shareContextMenu.copyUriModal.pngExportCopyUriHelpText',
          {
            defaultMessage:
              'Allows to generate selected file format programmatically outside Kibana or in Watcher.',
          }
        ),
        contentType: 'text',
        generateAssetURIValue: generateExportUrlPNG,
      },
    };
  };

  return {
    shareType: 'integration',
    groupId: 'export',
    id: 'imageReports',
    config: getShareMenuItems,
    prerequisiteCheck({ license, capabilities, objectType }) {
      if (!license) {
        return false;
      }

      let isSupportedType: boolean;

      if (!(isSupportedType = supportedObjectTypes.includes(objectType))) {
        return false;
      }

      const { showLinks } = checkLicense(license.check('reporting', 'gold'));
      const licenseHasScreenshotReporting = showLinks;

      const capabilityHasDashboardScreenshotReporting =
        capabilities.dashboard_v2?.generateScreenshot === true;
      const capabilityHasVisualizeScreenshotReporting =
        capabilities.visualize_v2?.generateScreenshot === true;

      if (!licenseHasScreenshotReporting) {
        return false;
      }

      if (objectType === 'dashboard' && !capabilityHasDashboardScreenshotReporting) {
        return false;
      }

      if (
        isSupportedType &&
        !capabilityHasVisualizeScreenshotReporting &&
        !capabilityHasDashboardScreenshotReporting
      ) {
        return false;
      }

      return true;
    },
  };
};
