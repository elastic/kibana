/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ThemeServiceSetup, ToastsSetup } from '@kbn/core/public';
import { FormattedMessage, InjectedIntl } from '@kbn/i18n-react';
import { toMountPoint } from '@kbn/kibana-react-plugin/public';
import React from 'react';
import type { ReportingAPIClient } from '../..';

export const generateReportingJobPNGPDF = (
  intl: InjectedIntl,
  apiClient: ReportingAPIClient,
  getJobParams: () => any,
  reportType: string,
  toasts: ToastsSetup,
  objectType: string,
  onClose: () => void,
  theme: ThemeServiceSetup
) => {
  const decoratedJobParams = apiClient.getDecoratedJobParams(getJobParams());
  return apiClient
    .createReportingJob(reportType, decoratedJobParams)
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
          { theme$: theme.theme$ }
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
        toastMessage: (
          // eslint-disable-next-line react/no-danger
          <span dangerouslySetInnerHTML={{ __html: error.body.message }} />
        ) as unknown as string,
      });
    });
};

export const generateReportingJobCSV = (
  intl: InjectedIntl,
  apiClient: ReportingAPIClient,
  getJobParams: () => any,
  reportType: string,
  toasts: ToastsSetup,
  objectType: string,
  onClose: () => void,
  theme: ThemeServiceSetup
) => {
  const decoratedJobParams = apiClient.getDecoratedJobParams(getJobParams());
  return apiClient
    .createReportingJob(reportType, decoratedJobParams)
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
          { theme$: theme.theme$ }
        ),
        'data-test-subj': 'queueReportSuccess',
      });
      if (onClose) {
        onClose();
      }
    })
    .catch((error) => {
      toasts.addError(error, {
        title: intl.formatMessage({
          id: 'reporting.share.modalContent.notification.reportingErrorTitle',
          defaultMessage: 'Unable to create report',
        }),
        toastMessage: (
          // eslint-disable-next-line react/no-danger
          <span dangerouslySetInnerHTML={{ __html: error.body.message }} />
        ) as unknown as string,
      });
    });
};
