/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CoreSetup } from '@kbn/core/public';
import { BaseParams } from '@kbn/reporting-common/types';
import { CSV_JOB_TYPE, JobParamsCSV } from '@kbn/reporting-export-types-csv-common';
import { JobAppParamsPDFV2, PDF_REPORT_TYPE_V2 } from '@kbn/reporting-export-types-pdf-common';
import React from 'react';
import { ReportingAPIClient } from '../..';
import { CsvModalContent } from '../share_context_menu/csv_export_modal';
import { ReportingPanelProps } from '../share_context_menu/reporting_panel_content';
import { ReportingModalContent } from '../share_context_menu/reporting_modal_content_lazy';
import { ScreenCapturePanelContent } from '../share_context_menu/screen_capture_panel_content_lazy';
/**
 * Properties for displaying a share menu with Reporting features.
 */
export interface ApplicationProps {
  /**
   * A function that Reporting calls to get the sharing data from the application.
   * Needed for CSV exports and Canvas PDF reports.
   */
  getJobParams?: JobAppParamsPDFV2 | JobParamsCSV | ReportingPanelProps['getJobParams'];

  /**
   * Option to control how the screenshot(s) is/are placed in the PDF
   */
  layoutOption?: 'canvas' | 'print';

  /**
   * Saved object ID
   */
  objectId?: string;

  /**
   * A function to callback when the Reporting panel should be closed
   */
  onClose: () => void;
  objectType: string;
  downloadCsvFromLens?: () => void;
}

export interface ReportingPublicComponents {
  /** Needed for Canvas PDF reports */
  ReportingPanelPDFV2(props: ApplicationProps): JSX.Element | undefined;
  /**
   * An element to display a form to export the page as PDF
   */
  ReportingModalPDFV2(props: ApplicationProps): JSX.Element;

  /**
   * An element to display a form to export the page as PNG
   */
  ReportingModalPNGV2(props: ApplicationProps): JSX.Element;

  /**
   * An element to display a form to export the page as CSV
   */
  ReportingModalCSV(props: ApplicationProps): JSX.Element;
}

/**
 * As of 7.14, the only shared component is a PDF report that is suited for Canvas integration.
 * This is not planned to expand, as work is to be done on moving the export-type implementations out of Reporting
 * Related Discuss issue: https://github.com/elastic/kibana/issues/101422
 */
export function getSharedComponents(
  core: CoreSetup,
  apiClient: ReportingAPIClient
): ReportingPublicComponents {
  return {
    ReportingPanelPDFV2(props: ApplicationProps) {
      const getJobParams = props.getJobParams as ReportingPanelProps['getJobParams'];
      if (props.layoutOption === 'canvas') {
        return (
          <ScreenCapturePanelContent
            requiresSavedState={false}
            reportType={PDF_REPORT_TYPE_V2}
            apiClient={apiClient}
            toasts={core.notifications.toasts}
            uiSettings={core.uiSettings}
            theme={core.theme}
            layoutOption={'canvas' as const}
            {...props}
            getJobParams={getJobParams}
          />
        );
      }
    },
    ReportingModalPDFV2(props: ApplicationProps) {
      return (
        <ReportingModalContent
          requiresSavedState={false}
          apiClient={apiClient}
          toasts={core.notifications.toasts}
          uiSettings={core.uiSettings}
          theme={core.theme}
          {...props}
        />
      );
    },
    ReportingModalPNGV2(props: ApplicationProps) {
      return (
        <ReportingModalContent
          requiresSavedState={false}
          apiClient={apiClient}
          toasts={core.notifications.toasts}
          uiSettings={core.uiSettings}
          theme={core.theme}
          {...props}
        />
      );
    },
    ReportingModalCSV(props: ApplicationProps) {
      const getJobParams = props.getJobParams as (
        forShareUrl?: boolean
      ) => Omit<BaseParams, 'browserTimezone' | 'version'>;
      return (
        <CsvModalContent
          requiresSavedState={false}
          apiClient={apiClient}
          toasts={core.notifications.toasts}
          uiSettings={core.uiSettings}
          reportType={CSV_JOB_TYPE}
          theme={core.theme}
          {...props}
          getJobParams={getJobParams}
        />
      );
    },
  };
}
