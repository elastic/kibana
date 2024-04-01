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
  EuiToolTip,
  EuiIcon,
} from '@elastic/eui';
import type { IUiSettingsClient, ThemeServiceSetup, ToastsSetup } from '@kbn/core/public';
import { FormattedMessage, InjectedIntl, injectI18n } from '@kbn/i18n-react';
import { toMountPoint } from '@kbn/kibana-react-plugin/public';
import React, { FC, useEffect, useMemo, useState } from 'react';
import useMountedState from 'react-use/lib/useMountedState';
import url from 'url';

import { i18n } from '@kbn/i18n';
import { BaseParams } from '@kbn/reporting-common/types';
import { ErrorUrlTooLongPanel } from './reporting_panel_content/components';
import { getMaxUrlLength } from './reporting_panel_content/constants';
import { ReportingAPIClient } from '../..';

export interface CsvModalProps {
  apiClient: ReportingAPIClient;
  toasts: ToastsSetup;
  uiSettings: IUiSettingsClient;
  reportType: string;
  requiresSavedState: boolean; // Whether the report to be generated requires saved state that is not captured in the URL submitted to the report generator.
  getJobParams: (forShareUrl?: boolean) => Omit<BaseParams, 'browserTimezone' | 'version'>;
  objectId?: string;
  isDirty?: boolean;
  onClose?: () => void;
  theme: ThemeServiceSetup;
  objectType: string;
}

export type Props = CsvModalProps & { intl: InjectedIntl };

export const CsvModalContentUI: FC<Props> = (props: Props) => {
  const isSaved = Boolean(props.objectId);
  const { apiClient, getJobParams, intl, toasts, theme, onClose, objectType, reportType, isDirty } =
    props;
  const isMounted = useMountedState();
  const [createReportingJob, setCreatingReportJob] = useState(false);
  const [absoluteUrl, setAbsoluteUrl] = useState('');
  const exceedsMaxLength = absoluteUrl.length >= getMaxUrlLength();

  const getAbsoluteReportGenerationUrl = useMemo(
    () => () => {
      const relativePath = apiClient.getReportingPublicJobPath(
        reportType,
        apiClient.getDecoratedJobParams(getJobParams())
      );
      return setAbsoluteUrl(url.resolve(window.location.href, relativePath));
    },
    [apiClient, getJobParams, reportType]
  );

  useEffect(() => {
    const reportingUrl = new URL(window.location.origin);
    reportingUrl.pathname = apiClient.getReportingPublicJobPath(
      reportType,
      apiClient.getDecoratedJobParams(getJobParams())
    );
    setAbsoluteUrl(reportingUrl.toString());
  }, [getAbsoluteReportGenerationUrl, apiClient, getJobParams, reportType]);

  const generateReportingJob = () => {
    const decoratedJobParams = apiClient.getDecoratedJobParams(getJobParams());
    setCreatingReportJob(true);
    return apiClient
      .createReportingJob(reportType, decoratedJobParams)
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
            id: 'reporting.share.modalContent.notification.reportingErrorTitle',
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
    return isUnsaved ? (
      <>
        <EuiToolTip
          content={
            <FormattedMessage
              id="reporting.share.modalContent.unsavedStateErrorText"
              defaultMessage="Save your work before copying this URL."
            />
          }
        >
          <EuiCopy textToCopy={absoluteUrl}>
            {(copy) => (
              <EuiButtonEmpty
                iconType="copy"
                disabled={isUnsaved}
                flush="both"
                onClick={copy}
                data-share-url={absoluteUrl}
                data-test-subj="shareReportingCopyURL"
              >
                <FormattedMessage
                  id="reporting.share.modalContent.copyPostUrlButtonLabel"
                  defaultMessage="Post URL"
                />
              </EuiButtonEmpty>
            )}
          </EuiCopy>
        </EuiToolTip>
        <EuiToolTip
          content={
            <FormattedMessage
              id="reporting.share.modalContent.howToCallGenerationDescription"
              defaultMessage="Alternatively, copy this POST URL to call generation from outside Kibana or from Watcher."
            />
          }
        >
          <EuiIcon type="questionInCircle" />
        </EuiToolTip>
      </>
    ) : (
      <>
        <EuiCopy textToCopy={absoluteUrl} anchorClassName="eui-displayBlock">
          {(copy) => (
            <EuiButtonEmpty
              iconType="copy"
              disabled={isUnsaved}
              flush="both"
              onClick={copy}
              data-share-url={absoluteUrl}
              data-test-subj="shareReportingCopyURL"
            >
              <FormattedMessage
                id="reporting.share.modalContent.csv.copyUrlButtonLabel"
                defaultMessage="Post URL"
              />
            </EuiButtonEmpty>
          )}
        </EuiCopy>
        <EuiToolTip content="Alternatively, copy this POST URL to call generation from outside Kibana or from Watcher.">
          <EuiIcon type="questionInCircle" />
        </EuiToolTip>
      </>
    );
  };

  return (
    <>
      <EuiModalBody>
        <EuiSpacer size="m" />
        <FormattedMessage
          id="reporting.share.csv.message"
          defaultMessage="Export a CSV of this search."
        />
      </EuiModalBody>
      <EuiModalFooter>
        {renderCopyURLButton({ isUnsaved: !isSaved, exceedsMaxLength })}
        {!isSaved ? (
          <EuiToolTip
            content={i18n.translate('reporting.share.panelContent.unsavedStateErrorTitle', {
              defaultMessage: 'Unsaved work',
            })}
          >
            <EuiButton
              disabled={Boolean(createReportingJob) || isDirty}
              onClick={() => generateReportingJob()}
              data-test-subj="generateReportButton"
              isLoading={Boolean(createReportingJob)}
            >
              <FormattedMessage
                id="reporting.share.generateButtonLabel"
                defaultMessage="Generate CSV"
              />
            </EuiButton>
          </EuiToolTip>
        ) : (
          <EuiButton
            disabled={Boolean(createReportingJob) || isDirty}
            fill
            onClick={() => generateReportingJob()}
            data-test-subj="generateReportButton"
            isLoading={Boolean(createReportingJob)}
          >
            <FormattedMessage
              id="reporting.share.generateButtonLabel"
              defaultMessage="Generate CSV"
            />
          </EuiButton>
        )}
      </EuiModalFooter>
    </>
  );
};

export const CsvModalContent = injectI18n(CsvModalContentUI);
