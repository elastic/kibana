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
import { ShareContext, ShareMenuItem, ShareMenuProvider } from '@kbn/share-plugin/public';
import type { ExportPanelShareOpts } from '.';
import { checkLicense } from '../..';
import { ReportingPanelContent } from './reporting_panel_content_lazy';

export const reportingCsvShareProvider = ({
  apiClient,
  toasts,
  uiSettings,
  application,
  license,
  usesUiCapabilities,
  theme,
}: ExportPanelShareOpts): ShareMenuProvider => {
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

    const shareActions: ShareMenuItem[] = [];

    const licenseCheck = checkLicense(license.check('reporting', 'basic'));
    const licenseToolTipContent = licenseCheck.message;
    const licenseHasCsvReporting = licenseCheck.showLinks;
    const licenseDisabled = !licenseCheck.enableLinks;

    // TODO: add abstractions in ExportTypeRegistry to use here?
    let capabilityHasCsvReporting = false;
    if (usesUiCapabilities) {
      capabilityHasCsvReporting = application.capabilities.discover?.generateCsv === true;
    } else {
      capabilityHasCsvReporting = true; // deprecated
    }

    if (licenseHasCsvReporting && capabilityHasCsvReporting) {
      const panelTitle = i18n.translate('reporting.share.contextMenu.csvReportsButtonLabel', {
        defaultMessage: 'CSV Reports',
      });

      shareActions.push({
        shareMenuItem: {
          name: panelTitle,
          icon: 'document',
          toolTipContent: licenseToolTipContent,
          disabled: licenseDisabled,
          ['data-test-subj']: 'CSVReports',
          sortOrder: 1,
        },
        panel: {
          id: 'csvReportingPanel',
          title: panelTitle,
          content: (
            <ReportingPanelContent
              requiresSavedState={false}
              apiClient={apiClient}
              toasts={toasts}
              uiSettings={uiSettings}
              reportType={reportType}
              layoutId={undefined}
              objectId={objectId}
              getJobParams={getJobParams}
              onClose={onClose}
              theme={theme}
            />
          ),
        },
      });
    }

    return shareActions;
  };

  return {
    id: 'csvReports',
    getShareMenuItems,
  };
};
