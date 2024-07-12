/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { Observable } from 'rxjs';

import { PDF_REPORT_TYPE_V2 } from '@kbn/reporting-export-types-pdf-common';
import { PNG_REPORT_TYPE_V2 } from '@kbn/reporting-export-types-png-common';

import { StartServices } from '..';
import { ReportingAPIClient } from '../..';
import { ReportingPanelProps } from '../share_context_menu/reporting_panel_content';
import { ScreenCapturePanelContent } from '../share_context_menu/screen_capture_panel_content_lazy';

/**
 * Properties for displaying a share menu with Reporting features.
 */
export interface ApplicationProps {
  /**
   * A function that Reporting calls to get the sharing data from the application.
   * Needed for CSV exports and Canvas PDF reports.
   */
  getJobParams: ReportingPanelProps['getJobParams'];

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
}

export interface ReportingPublicComponents {
  /** Needed for Canvas PDF reports */
  ReportingPanelPDFV2(props: ApplicationProps): JSX.Element | null;
  ReportingPanelPNGV2(props: ApplicationProps): JSX.Element | undefined;
}

/**
 * As of 7.14, the only shared component is a PDF report that is suited for Canvas integration.
 * This is not planned to expand, as work is to be done on moving the export-type implementations out of Reporting
 * Related Discuss issue: https://github.com/elastic/kibana/issues/101422
 */
export function getSharedComponents(
  apiClient: ReportingAPIClient,
  startServices$: Observable<StartServices>
): ReportingPublicComponents {
  return {
    ReportingPanelPDFV2(props: ApplicationProps) {
      if (props.layoutOption === 'canvas') {
        return (
          <ScreenCapturePanelContent
            requiresSavedState={false}
            reportType={PDF_REPORT_TYPE_V2}
            apiClient={apiClient}
            layoutOption={'canvas' as const}
            startServices$={startServices$}
            {...props}
          />
        );
      } else {
        return null;
      }
    },
    ReportingPanelPNGV2(props: ApplicationProps) {
      if (props.layoutOption === 'canvas') {
        return (
          <ScreenCapturePanelContent
            requiresSavedState={false}
            reportType={PNG_REPORT_TYPE_V2}
            apiClient={apiClient}
            layoutOption={'canvas' as const}
            startServices$={startServices$}
            {...props}
          />
        );
      }
    },
  };
}
