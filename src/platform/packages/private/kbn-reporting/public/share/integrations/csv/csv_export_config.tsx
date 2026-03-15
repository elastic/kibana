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
import { toMountPoint } from '@kbn/react-kibana-mount';
import type { SerializedSearchSourceFields } from '@kbn/data-plugin/common';
import { FormattedMessage } from '@kbn/i18n-react';
import type { ShareContext, ExportShare } from '@kbn/share-plugin/public';
import { convertRelativeTimeStringToAbsoluteTimeString } from '@kbn/share-plugin/public';
import type { LocatorParams } from '@kbn/reporting-common/types';
import { EuiCallOut, EuiText } from '@elastic/eui';
import type { ExportGenerationOpts } from '@kbn/share-plugin/public/types';
import type { ReportParamsGetter, ReportParamsGetterOptions } from '../../../types';
import type { CsvSearchModeParams } from '../../shared/get_search_csv_job_params';
import { getSearchCsvJobParams } from '../../shared/get_search_csv_job_params';
import type { ExportModalShareOpts } from '../../share_context_menu';

const toAbsoluteTimeRange = (locatorParams: LocatorParams[]): LocatorParams[] => {
  return locatorParams.map((lp) => {
    const timeRange = (lp.params as Record<string, unknown>).timeRange as
      | { from: string; to: string }
      | undefined;

    if (!timeRange) {
      return lp;
    }

    return {
      ...lp,
      params: {
        ...lp.params,
        timeRange: {
          from: convertRelativeTimeStringToAbsoluteTimeString(timeRange.from) ?? timeRange.from,
          to:
            convertRelativeTimeStringToAbsoluteTimeString(timeRange.to, { roundUp: true }) ??
            timeRange.to,
        },
      },
    };
  });
};

export const getCsvReportParams: ReportParamsGetter<
  ReportParamsGetterOptions & { forShareUrl?: boolean; useAbsoluteTime?: boolean },
  CsvSearchModeParams
> = ({ sharingData, forShareUrl = false, useAbsoluteTime = false }) => {
  const getSearchSource = sharingData.getSearchSource as ({
    addGlobalTimeFilter,
    absoluteTime,
  }: {
    addGlobalTimeFilter?: boolean;
    absoluteTime?: boolean;
  }) => SerializedSearchSourceFields;

  if (sharingData.isTextBased) {
    const locatorParams = sharingData.locatorParams as LocatorParams[];
    return {
      isEsqlMode: true,
      locatorParams: useAbsoluteTime ? toAbsoluteTimeRange(locatorParams) : locatorParams,
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

/**
 * @description Returns config for the CSV export integration
 */
export const getShareMenuItems =
  ({ apiClient, startServices$, csvConfig, isServerless = false }: ExportModalShareOpts) =>
  ({
    objectType,
    sharingData,
    shareableUrlLocatorParams,
  }: ShareContext): ReturnType<ExportShare['config']> extends Promise<infer R> ? R : never => {
    const getSearchModeParams = ({
      forShareUrl,
      absoluteTime,
    }: {
      forShareUrl?: boolean;
      absoluteTime?: boolean;
    }): CsvSearchModeParams =>
      getCsvReportParams({ sharingData, forShareUrl, useAbsoluteTime: absoluteTime });

    const generateReportingJobCSV = ({ intl, useAbsoluteTime }: ExportGenerationOpts) => {
      const { reportType, decoratedJobParams } = getSearchCsvJobParams({
        apiClient,
        searchModeParams: getSearchModeParams({ absoluteTime: useAbsoluteTime }),
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

    const { reportType } = getSearchCsvJobParams({
      apiClient,
      searchModeParams: getSearchModeParams({ forShareUrl: true }),
      title: sharingData.title as string,
    });

    const getAbsoluteUrl = (absoluteTime: boolean) => {
      const { reportType: _reportType, decoratedJobParams } = getSearchCsvJobParams({
        apiClient,
        searchModeParams: getSearchModeParams({
          forShareUrl: true,
          absoluteTime,
        }),
        title: sharingData.title as string,
      });
      const relativePath = apiClient.getReportingPublicJobPath(_reportType, decoratedJobParams);
      return new URL(relativePath, window.location.href).toString();
    };

    return {
      name: panelTitle,
      exportType: reportType,
      label: 'CSV',
      icon: 'tableDensityNormal',
      supportsAbsoluteTime: true,
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
        generateAssetURIValue: ({ useAbsoluteTime }) => getAbsoluteUrl(useAbsoluteTime),
      },
      renderTotalHitsSizeWarning: (totalHits: number = 0): React.ReactNode => {
        const maxRows = csvConfig?.maxRows || 0;
        if (totalHits >= maxRows) {
          return (
            <EuiCallOut
              announceOnMount
              size="s"
              color="warning"
              title={i18n.translate('reporting.share.csv.reporting.totalHitsSizeWarning.title', {
                defaultMessage:
                  'Your requested export includes {totalHits} rows, which exceeds the max of {maxRows}.',
                values: {
                  totalHits,
                  maxRows,
                },
              })}
              iconType="warning"
            >
              <EuiText component="p" size="s">
                {!isServerless &&
                  i18n.translate('reporting.share.csv.reporting.totalHitsSizeWarning.message', {
                    defaultMessage:
                      'This limit can be configured in kibana.yml, but increasing it may impact performance.',
                  })}
              </EuiText>
            </EuiCallOut>
          );
        }
      },
    };
  };
