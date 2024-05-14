/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { toMountPoint } from '@kbn/react-kibana-mount';
import React from 'react';
import { firstValueFrom } from 'rxjs';

import { CSV_JOB_TYPE, CSV_JOB_TYPE_V2 } from '@kbn/reporting-export-types-csv-common';

import type { SearchSourceFields } from '@kbn/data-plugin/common';
import { FormattedMessage, InjectedIntl } from '@kbn/i18n-react';
import { ShareContext, ShareMenuItem } from '@kbn/share-plugin/public';
import type { ExportModalShareOpts } from '.';
import { checkLicense } from '../..';

export const reportingCsvShareProvider = ({
  apiClient,
  application,
  license,
  usesUiCapabilities,
  startServices$,
}: ExportModalShareOpts) => {
  const getShareMenuItems = ({ objectType, sharingData, toasts }: ShareContext) => {
    if ('search' !== objectType) {
      return [];
    }

    // only csv v2 supports esql (isTextBased) reports
    // TODO: whole csv reporting should move to v2 https://github.com/elastic/kibana/issues/151190
    const reportType = sharingData.isTextBased ? CSV_JOB_TYPE_V2 : CSV_JOB_TYPE;

    const getSearchSource = sharingData.getSearchSource as ({
      addGlobalTimeFilter,
      absoluteTime,
    }: {
      addGlobalTimeFilter?: boolean;
      absoluteTime?: boolean;
    }) => SearchSourceFields;

    const jobParams = {
      title: sharingData.title as string,
      objectType,
    };

    const getJobParams = (forShareUrl?: boolean) => {
      if (reportType === CSV_JOB_TYPE_V2) {
        // csv v2 uses locator params
        return {
          ...jobParams,
          locatorParams: sharingData.locatorParams as [Record<string, unknown>],
        };
      }

      // csv v1 uses search source and columns
      return {
        ...jobParams,
        columns: sharingData.columns as string[] | undefined,
        searchSource: getSearchSource({
          addGlobalTimeFilter: true,
          absoluteTime: !forShareUrl,
        }),
      };
    };

    const shareActions: ShareMenuItem[] = [];

    const licenseCheck = checkLicense(license.check('reporting', 'basic'));
    const licenseToolTipContent = licenseCheck.message;
    const licenseHasCsvReporting = licenseCheck.showLinks;
    const licenseDisabled = !licenseCheck.enableLinks;

    let capabilityHasCsvReporting = false;
    if (usesUiCapabilities) {
      capabilityHasCsvReporting = application.capabilities.discover?.generateCsv === true;
    } else {
      capabilityHasCsvReporting = true; // deprecated
    }

    const generateReportingJobCSV = ({ intl }: { intl: InjectedIntl }) => {
      const decoratedJobParams = apiClient.getDecoratedJobParams(getJobParams());
      return apiClient
        .createReportingJob(reportType, decoratedJobParams)
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
        .catch((error) => {
          toasts.addError(error, {
            title: intl.formatMessage({
              id: 'reporting.share.modalContent.notification.reportingErrorTitle',
              defaultMessage: 'Unable to create report',
            }),
            toastMessage: error.body?.message,
          });
        });
    };

    if (licenseHasCsvReporting && capabilityHasCsvReporting) {
      const panelTitle = i18n.translate(
        'reporting.share.contextMenu.export.csvReportsButtonLabel',
        {
          defaultMessage: 'Export',
        }
      );

      const reportingUrl = new URL(window.location.origin);

      const relativePath = apiClient.getReportingPublicJobPath(
        reportType,
        apiClient.getDecoratedJobParams(getJobParams())
      );

      const absoluteUrl = new URL(relativePath, window.location.href).toString();

      shareActions.push({
        shareMenuItem: {
          name: panelTitle,
          toolTipContent: licenseToolTipContent,
          disabled: licenseDisabled,
          ['data-test-subj']: 'Export',
        },
        helpText: (
          <FormattedMessage
            id="reporting.share.csv.reporting.helpTextCSV"
            defaultMessage="Export a CSV of this {objectType}"
            values={{ objectType }}
          />
        ),
        reportType,
        label: 'CSV',
        copyURLButton: {
          id: 'reporting.share.modalContent.csv.copyUrlButtonLabel',
          dataTestSubj: 'shareReportingCopyURL',
          label: 'Post URL',
        },
        generateReportButton: (
          <FormattedMessage
            id="reporting.share.generateButtonLabelCSV"
            data-test-subj="generateReportButton"
            defaultMessage="Generate CSV"
          />
        ),
        generateReport: generateReportingJobCSV,
        generateCopyUrl: reportingUrl,
        absoluteUrl,
        renderCopyURLButton: true,
      });
    }

    return shareActions;
  };

  return {
    id: 'csvReportsModal',
    getShareMenuItems,
  };
};
