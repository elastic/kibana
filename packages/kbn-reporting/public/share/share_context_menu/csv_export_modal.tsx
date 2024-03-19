/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  EuiButton,
  EuiButtonEmpty,
  EuiCopy,
  EuiModalBody,
  EuiModalFooter,
  EuiSpacer,
} from '@elastic/eui';
import type { IUiSettingsClient, ThemeServiceSetup, ToastsSetup } from '@kbn/core/public';
import { FormattedMessage, InjectedIntl, injectI18n } from '@kbn/i18n-react';
import { toMountPoint } from '@kbn/kibana-react-plugin/public';
import React, { FC, useEffect, useMemo, useState } from 'react';
import useMountedState from 'react-use/lib/useMountedState';
import url from 'url';

import { JobParamsCSV } from '@kbn/reporting-export-types-csv-common';
import { BaseParamsV2 } from '@kbn/reporting-common/types';
import { ErrorUrlTooLongPanel, ErrorUnsavedWorkPanel } from './reporting_panel_content/components';
import { getMaxUrlLength } from './reporting_panel_content/constants';
import { ReportingAPIClient } from '../..';

export interface CsvModalProps {
  apiClient: ReportingAPIClient;
  toasts: ToastsSetup;
  uiSettings: IUiSettingsClient;
  reportType: string;
  requiresSavedState: boolean; // Whether the report to be generated requires saved state that is not captured in the URL submitted to the report generator.
  getJobParams: JobParamsCSV | BaseParamsV2;
  objectId?: string;
  isDirty?: boolean;
  onClose?: () => void;
  theme: ThemeServiceSetup;
  objectType: string;
}

export type Props = CsvModalProps & { intl: InjectedIntl };

export const CsvModalContentUI: FC<Props> = (props: Props) => {
  const isSaved = Boolean(props.objectId);
  const { apiClient, getJobParams, intl, toasts, theme, onClose, objectType, reportType } = props;
  const isMounted = useMountedState();
  const [createReportingJob, setCreatingReportJob] = useState(false);
  const [absoluteUrl, setAbsoluteUrl] = useState('');
  const exceedsMaxLength = absoluteUrl.length >= getMaxUrlLength();

  const getAbsoluteReportGenerationUrl = useMemo(
    () => () => {
      const relativePath = apiClient.getReportingPublicJobPath(
        reportType,
        apiClient.getDecoratedJobParams(getJobParams)
      );
      return setAbsoluteUrl(url.resolve(window.location.href, relativePath));
    },
    [apiClient, getJobParams, reportType]
  );

  useEffect(() => {
    const reportingUrl = new URL(window.location.origin);
    reportingUrl.pathname = apiClient.getReportingPublicJobPath(
      reportType,
      apiClient.getDecoratedJobParams(getJobParams)
    );
    setAbsoluteUrl(reportingUrl.toString());
  }, [getAbsoluteReportGenerationUrl, apiClient, getJobParams, reportType]);

  const generateReportingJob = () => {
    const decoratedJobParams = apiClient.getDecoratedJobParams(getJobParams);
    setCreatingReportJob(true);
    return apiClient
      .createReportingJob(reportType, decoratedJobParams)
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
                      id="xpack.reporting.publicNotifier.reportLink.reportingSectionUrlLinkLabel"
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
        if (isMounted()) {
          setCreatingReportJob(false);
        }
      })
      .catch((error) => {
        toasts.addError(error, {
          title: intl.formatMessage({
            id: 'xpack.reporting.modalContent.notification.reportingErrorTitle',
            defaultMessage: 'Unable to create report',
          }),
          toastMessage: (
            // eslint-disable-next-line react/no-danger
            <span dangerouslySetInnerHTML={{ __html: error.body.message }} />
          ) as unknown as string,
        });
        if (isMounted()) {
          setCreatingReportJob(false);
        }
      });
  };

  const renderCopyURLButton = ({
    isUnsaved,
  }: {
    isUnsaved: boolean;
    exceedsMaxLength: boolean;
  }) => {
    if (isUnsaved && exceedsMaxLength) {
      return <ErrorUrlTooLongPanel isUnsaved />;
    } else if (exceedsMaxLength) {
      return <ErrorUrlTooLongPanel isUnsaved={false} />;
    }
    return (
      <>
        {isUnsaved && <ErrorUnsavedWorkPanel />}
        <EuiCopy textToCopy={absoluteUrl} anchorClassName="eui-displayBlock">
          {(copy) => (
            <EuiButtonEmpty
              iconType="copy"
              disabled={isUnsaved}
              flush="both"
              onClick={copy}
              data-test-subj="shareReportingCopyURL"
            >
              <FormattedMessage
                id="xpack.reporting.modalContent.copyUrlButtonLabel"
                defaultMessage="Copy POST URL  "
              />
            </EuiButtonEmpty>
          )}
        </EuiCopy>
      </>
    );
  };

  return (
    <>
      <EuiModalBody>
        <EuiSpacer size="m" />
        <FormattedMessage id="share.csv.message" defaultMessage="Export a CSV of this search." />
        <EuiSpacer size="m" />
        {renderCopyURLButton({ isUnsaved: !isSaved, exceedsMaxLength })}
      </EuiModalBody>
      <EuiModalFooter>
        <EuiButton
          disabled={Boolean(createReportingJob)}
          fill
          onClick={() => generateReportingJob()}
          data-test-subj="generateReportButton"
          isLoading={Boolean(createReportingJob)}
        >
          <FormattedMessage
            id="xpack.reporting.generateButtonLabel"
            defaultMessage="Generate CSV"
          />
        </EuiButton>
      </EuiModalFooter>
    </>
  );
};

export const CsvModalContent = injectI18n(CsvModalContentUI);
