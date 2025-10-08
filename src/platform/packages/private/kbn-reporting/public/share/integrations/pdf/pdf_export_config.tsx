/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { firstValueFrom } from 'rxjs';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { toMountPoint } from '@kbn/react-kibana-mount';
import type { ShareContext, ExportShare } from '@kbn/share-plugin/public';
import type { ExportGenerationOpts } from '@kbn/share-plugin/public/types';
import type {
  ReportingSharingData,
  JobParamsProviderOptions,
  ExportModalShareOpts,
} from '../../share_context_menu';
import { getJobParams } from '../../shared/get_png_pdf_job_params';

/**
 * @description Returns config for the PDF export integration
 */
export const getShareMenuItems =
  ({ apiClient, startServices$ }: ExportModalShareOpts) =>
  ({
    objectType,
    objectId,
    isDirty,
    onClose,
    shareableUrl,
    shareableUrlForSavedObject,
    ...shareOpts
  }: ShareContext): ReturnType<ExportShare['config']> extends Promise<infer R> ? R : never => {
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
