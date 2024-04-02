/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import React from 'react';

import { CSV_JOB_TYPE, CSV_JOB_TYPE_V2 } from '@kbn/reporting-export-types-csv-common';

import type { SearchSourceFields } from '@kbn/data-plugin/common';
import { ShareContext, ShareMenuProvider } from '@kbn/share-plugin/public';
import { FormattedMessage } from '@kbn/i18n-react';
import type { ExportModalShareOpts } from '.';
import { checkLicense } from '../..';
import { generateReportingJobCSV } from '../shared/get_report_generate';

export const reportingCsvShareProvider = ({
  apiClient,
  application,
  license,
  usesUiCapabilities,
}: ExportModalShareOpts): ShareMenuProvider => {
  const getShareMenuItems = ({ objectType, objectId, sharingData, onClose }: ShareContext) => {
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

    const shareActions = [];

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

    if (licenseHasCsvReporting && capabilityHasCsvReporting) {
      const panelTitle = i18n.translate('reporting.share.contextMenu.csvReportsButtonLabel', {
        defaultMessage: 'Export',
      });

      shareActions.push({
        shareMenuItem: {
          name: panelTitle,
          toolTipContent: licenseToolTipContent,
          disabled: licenseDisabled,
          ['data-test-subj']: 'Export',
        },
        tabType: 'Export',
        helpText: (
          <FormattedMessage
            id="share.csv.reporting.helpText"
            defaultMessage="Export a CSV of this {objectType}"
            values={{ objectType }}
          />
        ),
        reportType: [reportType],
        copyURLButton: {
          id: 'reporting.share.modalContent.csv.copyUrlButtonLabel',
          dataTestSubj: 'shareReportingCopyURL',
          label: 'Post URL',
        },
        generateReportButton: (
          <FormattedMessage
            id="reporting.share.generateButtonLabel"
            data-test-subj="generateReportButton"
            defaultMessage="Generate CSV"
          />
        ),
        getJobParams,
        createReportingJob: generateReportingJobCSV,
        reportingAPIClient: apiClient,
      });
    }

    return shareActions;
  };

  return {
    id: 'csvReports',
    getShareMenuItems,
  };
};
