/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { type IModalTabDeclaration } from '@kbn/shared-ux-tabbed-modal';
import { BaseParams } from '@kbn/reporting-common/types';
import { toMountPoint } from '@kbn/kibana-react-plugin/public';
import useMountedState from 'react-use/lib/useMountedState';
import { JobParamsProviderOptions } from '@kbn/reporting-public/share/share_context_menu';
import { LayoutParams } from '@kbn/screenshotting-plugin/common';
import { ExportContent } from './export_content';
import { useShareTabsContext } from '../../context';
export { ExportContent } from './export_content';

type IExportTab = IModalTabDeclaration<{
  setCreatingReportJob: boolean;
  selectedRadio: AllowedImageExportType;
  isMounted: () => boolean;
  usePrintLayout: boolean;
}>;

type AllowedImageExportType = 'pngV2' | 'printablePdfV2';

type AppParams = Omit<BaseParams, 'browserTimezone' | 'version'>;

const EXPORT_TAB_ACTIONS = {
  SET_EXPORT_REPORT: () => Promise<void>,
};

const exportTabReducer: IExportTab['reducer'] = (
  state = {
    setCreatingReportJob: false,
    selectedRadio: 'printablePdfV2' as const,
    isMounted: useMountedState(),
    usePrintLayout: false,
  },
  action
) => {
  switch (action.type) {
    case EXPORT_TAB_ACTIONS.SET_EXPORT_REPORT:
      return {
        ...state,
        generateReportingJob: action.payload,
      };
    default:
      return state;
  }
};

const ExportTabContent: IExportTab['content'] = ({ state, dispatch }) => {
  const {
    isDirty,
    apiClient,
    objectType,
    toasts,
    theme,
    onClose,
    intl,
    getJobParams,
    jobProviderOptions,
  } = useShareTabsContext()!;

  const getJobsParams = useCallback(
    (type: AllowedImageExportType, opts?: JobParamsProviderOptions) => {
      if (!opts) {
        return { ...getJobParams };
      }

      const {
        sharingData: { title, layout, locatorParams },
      } = opts;

      const baseParams = {
        objectType,
        layout,
        title,
      };

      if (type === 'printablePdfV2') {
        // multi locator for PDF V2
        return { ...baseParams, locatorParams: [locatorParams] };
      } else if (type === 'pngV2') {
        // single locator for PNG V2
        return { ...baseParams, locatorParams };
      }

      // Relative URL must have URL prefix (Spaces ID prefix), but not server basePath
      // Replace hashes with original RISON values.
      const relativeUrl = opts?.shareableUrl.replace(
        window.location.origin + apiClient.getServerBasePath(),
        ''
      );

      // single URL for PNG
      return { ...baseParams, relativeUrl };
    },
    [apiClient, objectType, getJobParams]
  );

  const getLayout = useCallback((): LayoutParams => {
    let dimensions;

    if (!dimensions) {
      const el = document.querySelector('[data-shared-items-container]');
      const { height, width } = el ? el.getBoundingClientRect() : { height: 768, width: 1024 };
      dimensions = { height, width };
    }
    if (state.usePrintLayout) {
      return { id: 'print', dimensions };
    }

    return { id: 'preserve_layout', dimensions };
  }, [state.usePrintLayout]);

  const getJobParamsHelper = useCallback(
    (shareableUrl?: boolean) => {
      return { ...getJobsParams(state.selectedRadio, jobProviderOptions), layout: getLayout() };
    },
    [getJobsParams, getLayout, jobProviderOptions, state.selectedRadio]
  );

  const generateReportingJob = () => {
    const decoratedJobParams = apiClient.getDecoratedJobParams(
      getJobParamsHelper(false) as unknown as AppParams
    );
    state.setCreatingReportJob = true;
    return apiClient
      .createReportingJob(state.selectedRadio, decoratedJobParams)
      .then(() => {
        toasts.addSuccess({
          title: intl.formatMessage(
            {
              id: 'xpack.reporting.modalContent.successfullyQueuedReportNotificationTitle',
              defaultMessage: 'Queued report for {objectType}',
            },
            { objectType }
          ),
          text: toMountPoint(
            <FormattedMessage
              id="xpack.reporting.modalContent.successfullyQueuedReportNotificationDescription"
              defaultMessage="Track its progress in {path}."
              values={{
                path: (
                  <a href={apiClient.getManagementLink()}>
                    <FormattedMessage
                      id="xpack.reporting.modalContent.publicNotifier.reportLink.reportingSectionUrlLinkLabel"
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
        if (state.isMounted()) {
          state.setCreatingReportJob = false;
        }
      })
      .catch((error) => {
        toasts.addError(error, {
          title: intl!.formatMessage({
            id: 'xpack.reporting.modalContent.notification.reportingErrorTitle',
            defaultMessage: 'Unable to create report',
          }),
          toastMessage: (
            // eslint-disable-next-line react/no-danger
            <span dangerouslySetInnerHTML={{ __html: error.body.message }} />
          ) as unknown as string,
        });
        if (state.isMounted()) {
          state.setCreatingReportJob = false;
        }
      });
  };
  return (
    <ExportContent
      {...{ isDirty, apiClient, objectType, toasts, theme, onClose, generateReportingJob }}
    />
  );
};

export const exportTab: IExportTab = {
  id: 'export',
  name: i18n.translate('share.contextMenu.permalinksTab', {
    defaultMessage: 'Export',
  }),
  description: (
    <FormattedMessage
      id="share.dashboard.link.description"
      defaultMessage="Share a direct link to this search."
    />
  ),
  content: ExportTabContent,
  reducer: exportTabReducer,
  modalActionBtn: {
    id: 'export',
    dataTestSubj: 'generateExportButton',
    formattedMessageId: 'share.link.generateExportButton',
    defaultMessage: 'Generate export',
    handler: ({ state }) => {
      state.selectedRadio;
    },
  },
};
