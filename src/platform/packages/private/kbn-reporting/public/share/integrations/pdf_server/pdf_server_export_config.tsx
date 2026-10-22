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
  ScreenCaptureExportShareOpts,
} from '../../share_context_menu';
import { getJobParams } from '../../shared/get_png_pdf_job_params';
import { getExperimentalBadge } from '../../shared/experimental_badge';

const SERVER_RENDER_PDF_JOB_TYPE = 'printablePdfServer';

/**
 * Config for the `printablePdfServer` (Chromium-free) share-menu entry. Deliberately a
 * near-exact copy of `pdf_export_config.tsx`, not a generalization of it: `getJobParams`
 * already produces a `{ locatorParams: [locator], layout, objectType, title }` shape that
 * is also exactly `ServerRenderJobParams`'s shape (`job_params.ts`), so the only things
 * that differ from the real `printablePdfV2` integration are the `exportType` string
 * handed to `apiClient` and the label/test-subj so the two entries are distinguishable in
 * the Share menu. No `renderLayoutOptionSwitch` ("optimize for printing") -- the server
 * render path does not implement the multi-page `print` layout yet (see
 * `server_render_pdf_export_type.ts`'s doc comment).
 */
export const getShareMenuItems =
  ({ apiClient, startServices$, isExperimental = false }: ScreenCaptureExportShareOpts) =>
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

    const generateReportPDFServer = ({ intl }: ExportGenerationOpts) => {
      const decoratedJobParams = apiClient.getDecoratedJobParams({
        ...getJobParams(jobProviderOptions, 'printablePdfV2')(),
      });

      return firstValueFrom(startServices$).then(([startServices]) => {
        const {
          notifications: { toasts },
          rendering,
        } = startServices;
        return apiClient
          .createReportingJob(SERVER_RENDER_PDF_JOB_TYPE, decoratedJobParams)
          .then(() => {
            toasts.addSuccess({
              title: intl.formatMessage(
                {
                  id: 'reporting.share.modalContent.successfullyQueuedServerRenderReportNotificationTitle',
                  defaultMessage: 'Queued server-rendered report for {objectType}',
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

    const generateExportUrlPDFServer = () => {
      const jobParams = apiClient.getDecoratedJobParams(
        getJobParams(jobProviderOptions, 'printablePdfV2')()
      );
      const relativePath = apiClient.getReportingPublicJobPath(
        SERVER_RENDER_PDF_JOB_TYPE,
        jobParams
      );

      return new URL(relativePath, window.location.href).toString();
    };

    return {
      name: i18n.translate('reporting.shareContextMenu.serverRenderExportsButtonLabel', {
        defaultMessage: 'PDF (server render)',
      }),
      icon: 'document',
      disabled: sharingData.reportingDisabled,
      label: 'PDF (server render)' as const,
      badge: getExperimentalBadge(isExperimental),
      generateAssetExport: generateReportPDFServer,
      exportType: SERVER_RENDER_PDF_JOB_TYPE,
      requiresSavedState,
      renderLayoutOptionSwitch: false,
      copyAssetURIConfig: {
        headingText: i18n.translate(
          'reporting.shareContextMenu.copyUriModal.pdfServerExportCopyUriHeading',
          {
            defaultMessage: 'Post URL',
          }
        ),
        helpText: i18n.translate(
          'reporting.shareContextMenu.copyUriModal.pdfServerExportCopyUriHelpText',
          {
            defaultMessage:
              'Allows to generate selected file format programmatically outside Kibana or in Watcher.',
          }
        ),
        contentType: 'text',
        generateAssetURIValue: generateExportUrlPDFServer,
      },
    };
  };
