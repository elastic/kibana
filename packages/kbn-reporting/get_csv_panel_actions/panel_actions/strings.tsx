/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { ReportingAPIClient } from '@kbn/reporting-public/reporting_api_client';

interface I18nStrings {
  displayName: string;
  toasts: {
    error: {
      title: string;
      body: string;
    };
    success: {
      title: string;
      body: JSX.Element;
    };
  };
}

export const getI18nStrings = (
  apiClient: ReportingAPIClient
): Record<'download' | 'generate', I18nStrings> => ({
  download: {
    displayName: i18n.translate('reporting.share.panelAction.downloadCsvPanelTitle', {
      defaultMessage: 'Download CSV',
    }),
    toasts: {
      error: {
        title: i18n.translate('reporting.share.panelAction.failedCsvReportTitle', {
          defaultMessage: `CSV download failed`,
        }),
        body: i18n.translate('reporting.share.panelAction.failedCsvReportMessage', {
          defaultMessage: `We couldn't download your CSV at this time.`,
        }),
      },
      success: {
        title: i18n.translate('reporting.share.panelAction.csvDownloadStartedTitle', {
          defaultMessage: `CSV download started`,
        }),
        body: (
          <FormattedMessage
            id="reporting.share.panelAction.csvDownloadStartedMessage"
            defaultMessage="Your CSV will download momentarily."
          />
        ),
      },
    },
  },
  generate: {
    displayName: i18n.translate('reporting.share.panelAction.generateCsvPanelTitle', {
      defaultMessage: 'Generate CSV report',
    }),
    toasts: {
      error: {
        title: i18n.translate('reporting.share.panelAction.failedGenerateCsvReportTitle', {
          defaultMessage: `CSV report failed`,
        }),
        body: i18n.translate('reporting.share.panelAction.failedGenerateCsvReportMessage', {
          defaultMessage: `We couldn't generate your CSV at this time.`,
        }),
      },
      success: {
        title: i18n.translate('reporting.share.panelAction.csvReportStartedTitle', {
          defaultMessage: `Queued report for CSV`,
        }),
        body: (
          <FormattedMessage
            id="reporting.share.panelAction.successfullyQueuedReportNotificationDescription"
            defaultMessage="Track its progress in {path}."
            values={{
              path: (
                <a href={apiClient.getManagementLink()}>
                  <FormattedMessage
                    id="reporting.share.panelAction.reportLink.reportingSectionUrlLinkLabel"
                    defaultMessage="Stack Management &gt; Reporting"
                  />
                </a>
              ),
            }}
          />
        ),
      },
    },
  },
});
