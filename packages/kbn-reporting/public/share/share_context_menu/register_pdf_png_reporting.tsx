/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import React from 'react';
import { ShareContext, ShareMenuProvider } from '@kbn/share-plugin/public';
import { downloadCSVs } from '@kbn/lens-plugin/public';
import { TableInspectorAdapter } from '@kbn/lens-plugin/public/editor_frame_service/types';
import { checkLicense } from '../../license_check';
import { ExportModalShareOpts, JobParamsProviderOptions, ReportingSharingData } from '.';
import { ReportingModalContent } from './reporting_panel_content_lazy';

export const isJobV2Params = ({ sharingData }: { sharingData: Record<string, unknown> }): boolean =>
  sharingData.locatorParams != null;

export const reportingScreenshotShareProvider = ({
  apiClient,
  toasts,
  uiSettings,
  license,
  application,
  usesUiCapabilities,
  theme,
  formatFactoryFn,
}: ExportModalShareOpts): ShareMenuProvider => {
  const getShareMenuItems = ({
    objectType,
    objectId,
    isDirty,
    onClose,
    shareableUrl,
    shareableUrlForSavedObject,
    ...shareOpts
  }: ShareContext) => {
    const { enableLinks, showLinks, message } = checkLicense(license.check('reporting', 'gold'));
    const licenseToolTipContent = message;
    const licenseHasScreenshotReporting = showLinks;
    const licenseDisabled = !enableLinks;

    let capabilityHasDashboardScreenshotReporting = false;
    let capabilityHasVisualizeScreenshotReporting = false;
    if (usesUiCapabilities) {
      capabilityHasDashboardScreenshotReporting =
        application.capabilities.dashboard?.generateScreenshot === true;
      capabilityHasVisualizeScreenshotReporting =
        application.capabilities.visualize?.generateScreenshot === true;
    } else {
      // deprecated
      capabilityHasDashboardScreenshotReporting = true;
      capabilityHasVisualizeScreenshotReporting = true;
    }

    if (!licenseHasScreenshotReporting) {
      return [];
    }
    // for lens png pdf and csv are combined into one modal
    const isSupportedType = ['dashboard', 'visualization', 'lens'].includes(objectType);

    if (!isSupportedType) {
      return [];
    }

    if (objectType === 'dashboard' && !capabilityHasDashboardScreenshotReporting) {
      return [];
    }

    if (
      isSupportedType &&
      !capabilityHasVisualizeScreenshotReporting &&
      !capabilityHasDashboardScreenshotReporting
    ) {
      return [];
    }

    const { sharingData } = shareOpts as unknown as { sharingData: ReportingSharingData };
    const shareActions = [];

    const jobProviderOptions: JobParamsProviderOptions = {
      shareableUrl: isDirty ? shareableUrl : shareableUrlForSavedObject ?? shareableUrl,
      objectType,
      sharingData,
    };

    const isV2Job = isJobV2Params(jobProviderOptions);
    const requiresSavedState = !isV2Job;
    const { title, activeData, columnsSorting } = sharingData as unknown as {
      title: string;
      activeData: TableInspectorAdapter;
      columnsSorting?: string[];
    };

    shareActions.push({
      shareMenuItem: {
        name: i18n.translate('reporting.shareContextMenu.ExportsButtonLabel', {
          defaultMessage: 'Export',
        }),
        toolTipContent: licenseToolTipContent,
        disabled: licenseDisabled || sharingData.reportingDisabled,
        ['data-test-subj']: 'imageExports',
      },
      panel: {
        id: 'reportingImageModal',
        title: i18n.translate('reporting.shareContextMenu.ReportsButtonLabel', {
          defaultMessage: 'Generate report',
        }),
        content: (
          <ReportingModalContent
            apiClient={apiClient}
            toasts={toasts}
            uiSettings={uiSettings}
            objectId={objectId}
            requiresSavedState={requiresSavedState}
            layoutOption={objectType === 'dashboard' ? 'print' : undefined}
            jobProviderOptions={jobProviderOptions}
            isDirty={isDirty}
            onClose={() => {
              onClose();
            }}
            theme={theme}
            objectType={objectType}
            downloadCsvFromLens={async () => {
              return await downloadCSVs({
                title,
                formatFactory: formatFactoryFn(),
                activeData,
                uiSettings,
                columnsSorting,
              });
            }}
          />
        ),
      },
    });
    return shareActions;
  };

  return {
    id: 'screenCaptureReports',
    getShareMenuItems,
  };
};
