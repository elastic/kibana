/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import { toMountPoint } from '@kbn/react-kibana-mount';
import React from 'react';
import { firstValueFrom } from 'rxjs';
import type { SerializedSearchSourceFields } from '@kbn/data-plugin/common';
import { FormattedMessage, InjectedIntl } from '@kbn/i18n-react';
import { ShareContext, type ExportShare } from '@kbn/share-plugin/public';
import { LocatorParams } from '@kbn/reporting-common/types';
import { ReportParamsGetter, ReportParamsGetterOptions } from '../../types';
import { getSearchCsvJobParams, CsvSearchModeParams } from '../shared/get_search_csv_job_params';
import type { ExportModalShareOpts } from '.';
import { checkLicense } from '../..';

export const getCsvReportParams: ReportParamsGetter<
  ReportParamsGetterOptions & { forShareUrl?: boolean },
  CsvSearchModeParams
> = ({ sharingData, forShareUrl = false }) => {
  const getSearchSource = sharingData.getSearchSource as ({
    addGlobalTimeFilter,
    absoluteTime,
  }: {
    addGlobalTimeFilter?: boolean;
    absoluteTime?: boolean;
  }) => SerializedSearchSourceFields;

  if (sharingData.isTextBased) {
    // csv v2 uses locator params
    return {
      isEsqlMode: true,
      locatorParams: sharingData.locatorParams as LocatorParams[],
    };
  }

  // csv v1 uses search source and columns
  return {
    isEsqlMode: false,
    columns: sharingData.columns as string[] | undefined,
    searchSource: getSearchSource({
      addGlobalTimeFilter: true,
      absoluteTime: !forShareUrl,
    }),
  };
};

export const reportingCsvExportProvider = ({
  apiClient,
  startServices$,
}: ExportModalShareOpts): ExportShare => {
  const getShareMenuItems = ({
    objectType,
    sharingData,
  }: ShareContext): ReturnType<ExportShare['config']> => {
    const getSearchModeParams = (forShareUrl?: boolean): CsvSearchModeParams =>
      getCsvReportParams({ sharingData, forShareUrl });

    const generateReportingJobCSV = ({ intl }: { intl: InjectedIntl }) => {
      const { reportType, decoratedJobParams } = getSearchCsvJobParams({
        apiClient,
        searchModeParams: getSearchModeParams(false),
        title: sharingData.title as string,
      });

      return firstValueFrom(startServices$).then(([startServices]) => {
        const {
          notifications: { toasts },
          rendering,
        } = startServices;

        return apiClient
          .createReportingShareJob(reportType, decoratedJobParams)
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
          .catch((error) => {
            toasts.addError(error, {
              title: intl.formatMessage({
                id: 'reporting.share.modalContent.notification.reportingErrorTitle',
                defaultMessage: 'Unable to create report',
              }),
              toastMessage: (
                // eslint-disable-next-line react/no-danger
                <span dangerouslySetInnerHTML={{ __html: error.body?.message }} />
              ) as unknown as string,
            });
          });
      });
    };

    const panelTitle = i18n.translate('reporting.share.contextMenu.export.csvReportsButtonLabel', {
      defaultMessage: 'Export',
    });

    const { reportType, decoratedJobParams } = getSearchCsvJobParams({
      apiClient,
      searchModeParams: getSearchModeParams(true),
      title: sharingData.title as string,
    });

    const relativePath = apiClient.getReportingPublicJobPath(reportType, decoratedJobParams);

    const absoluteUrl = new URL(relativePath, window.location.href).toString();

    return {
      name: panelTitle,
      exportType: reportType,
      label: 'CSV',
      icon: 'tableDensityNormal',
      generateAssetExport: generateReportingJobCSV,
      helpText: (
        <FormattedMessage
          id="reporting.share.csv.reporting.helpTextCSV"
          defaultMessage="Export a CSV of this {objectType}."
          values={{ objectType }}
        />
      ),
      generateExportButtonLabel: (
        <FormattedMessage
          id="reporting.share.generateButtonLabelCSV"
          data-test-subj="generateReportButton"
          defaultMessage="Generate CSV"
        />
      ),
      copyAssetURIConfig: {
        headingText: i18n.translate('reporting.export.csv.exportFlyout.csvExportCopyUriHeading', {
          defaultMessage: 'Post URL',
        }),
        helpText: i18n.translate('reporting.export.csv.exportFlyout.csvExportCopyUriHelpText', {
          defaultMessage:
            'Allows to generate selected file format programmatically outside Kibana or in Watcher.',
        }),
        contentType: 'text',
        generateAssetURIValue: () => absoluteUrl,
      },
    };
  };

  return {
    shareType: 'integration',
    id: 'csvReports',
    groupId: 'export',
    config: getShareMenuItems,
    prerequisiteCheck: ({ license, capabilities }) => {
      if (!license) {
        return false;
      }

      const licenseCheck = checkLicense(license.check('reporting', 'basic'));

      const licenseHasCsvReporting = licenseCheck.showLinks;

      const capabilityHasCsvReporting = capabilities.discover_v2?.generateCsv === true;

      if (!(licenseHasCsvReporting && capabilityHasCsvReporting)) {
        return false;
      }

      return true;
    },
  };
};
