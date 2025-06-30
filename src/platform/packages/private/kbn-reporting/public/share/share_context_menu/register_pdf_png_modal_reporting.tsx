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
import { ReportParamsGetter, ReportParamsGetterOptions } from '../../types';
import { ExportModalShareOpts, JobParamsProviderOptions, ReportingSharingData } from '.';
import { checkLicense } from '../../license_check';

const getBaseParams = (objectType: string) => {
  const el = document.querySelector('[data-shared-items-container]');
  const { height, width } = el ? el.getBoundingClientRect() : { height: 768, width: 1024 };
  const dimensions = { height, width };
  return {
    objectType,
    layout: {
      id: 'preserve_layout' as 'preserve_layout' | 'print',
      dimensions,
    },
  };
};

interface PngPdfReportBaseParams {
  layout: { dimensions: { height: number; width: number }; id: 'preserve_layout' | 'print' };
  objectType: string;
  locatorParams: any;
}

export const getPngReportParams: ReportParamsGetter<
  ReportParamsGetterOptions,
  PngPdfReportBaseParams
> = ({ sharingData }): PngPdfReportBaseParams => {
  return {
    ...getBaseParams('pngV2'),
    locatorParams: sharingData.locatorParams,
  };
};

export const getPdfReportParams: ReportParamsGetter<
  ReportParamsGetterOptions & { optimizedForPrinting?: boolean },
  PngPdfReportBaseParams
> = ({ sharingData, optimizedForPrinting = false }) => {
  const params = {
    ...getBaseParams('printablePdfV2'),
    locatorParams: [sharingData.locatorParams],
  };
  if (optimizedForPrinting) {
    params.layout.id = 'print';
  }
  return params;
};

const getJobParams = (opts: JobParamsProviderOptions, type: 'pngV2' | 'printablePdfV2') => () => {
  const { objectType, sharingData, optimizedForPrinting } = opts;
  let baseParams: PngPdfReportBaseParams;
  if (type === 'pngV2') {
    baseParams = getPngReportParams({ sharingData });
  } else {
    baseParams = getPdfReportParams({
      sharingData,
      optimizedForPrinting,
    });
  }
  return {
    ...baseParams,
    objectType,
    title: sharingData.title,
  };
};

export const reportingPDFExportProvider = ({
  apiClient,
  usesUiCapabilities,
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

      let capabilityHasDashboardScreenshotReporting = false;
      let capabilityHasVisualizeScreenshotReporting = false;
      if (usesUiCapabilities) {
        capabilityHasDashboardScreenshotReporting =
          capabilities.dashboard?.generateScreenshot === true;
        capabilityHasVisualizeScreenshotReporting =
          capabilities.visualize?.generateScreenshot === true;
      } else {
        // deprecated
        capabilityHasDashboardScreenshotReporting = true;
        capabilityHasVisualizeScreenshotReporting = true;
      }

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
  usesUiCapabilities,
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

      let capabilityHasDashboardScreenshotReporting = false;
      let capabilityHasVisualizeScreenshotReporting = false;
      if (usesUiCapabilities) {
        capabilityHasDashboardScreenshotReporting =
          capabilities.dashboard?.generateScreenshot === true;
        capabilityHasVisualizeScreenshotReporting =
          capabilities.visualize?.generateScreenshot === true;
      } else {
        // deprecated
        capabilityHasDashboardScreenshotReporting = true;
        capabilityHasVisualizeScreenshotReporting = true;
      }

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
