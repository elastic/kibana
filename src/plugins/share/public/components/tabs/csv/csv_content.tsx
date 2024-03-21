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
import { FormattedMessage, InjectedIntl, injectI18n } from '@kbn/i18n-react';
import { toMountPoint } from '@kbn/kibana-react-plugin/public';
import React, { useEffect, useMemo, useState } from 'react';
import useMountedState from 'react-use/lib/useMountedState';
import url from 'url';

import { i18n } from '@kbn/i18n';
import { IShareContext } from '../../context';
import { getMaxUrlLength } from '../../share/share_context_menu/reporting_panel_content/constants';
import { ErrorUrlTooLongPanel } from '../../share/share_context_menu/reporting_panel_content/components';

type CsvProps = Pick<
  IShareContext,
  | 'apiClient'
  | 'toasts'
  | 'uiSettings'
  | 'objectId'
  | 'isDirty'
  | 'onClose'
  | 'theme'
  | 'objectType'
  | 'csvType'
  | 'getJobParams'
> & {
  intl: InjectedIntl;
};

export const CsvContentUi = ({
  apiClient,
  intl,
  toasts,
  theme,
  onClose,
  objectType,
  objectId,
  csvType,
  getJobParams,
}: CsvProps) => {
  const isSaved = Boolean(objectId);
  const isMounted = useMountedState();
  const [createReportingJob, setCreatingReportJob] = useState(false);
  const [absoluteUrl, setAbsoluteUrl] = useState('');
  const exceedsMaxLength = absoluteUrl.length >= getMaxUrlLength();

  const getAbsoluteReportGenerationUrl = useMemo(
    () => () => {
      const relativePath = apiClient.getReportingPublicJobPath(
        csvType,
        apiClient.getDecoratedJobParams(getJobParams())
      );
      return setAbsoluteUrl(url.resolve(window.location.href, relativePath));
    },
    [apiClient, getJobParams, csvType]
  );

  useEffect(() => {
    const reportingUrl = new URL(window.location.origin);
    reportingUrl.pathname = apiClient.getReportingPublicJobPath(
      csvType,
      apiClient.getDecoratedJobParams(getJobParams())
    );
    setAbsoluteUrl(reportingUrl.toString());
  }, [getAbsoluteReportGenerationUrl, apiClient, getJobParams, csvType]);

  const generateReportingJob = () => {
    const decoratedJobParams = apiClient.getDecoratedJobParams(getJobParams());
    setCreatingReportJob(true);
    return apiClient
      .createReportingJob(csvType, decoratedJobParams)
      .then(() => {
        toasts.addSuccess({
          title: intl.formatMessage(
            {
              id: 'share.modalContent.successfullyQueuedReportNotificationTitle',
              defaultMessage: 'Queued report for {objectType}',
            },
            { objectType }
          ),
          text: toMountPoint(
            <FormattedMessage
              id="share.modalContent.successfullyQueuedReportNotificationDescription"
              defaultMessage="Track its progress in {path}."
              values={{
                path: (
                  <a href={apiClient.getManagementLink()}>
                    <FormattedMessage
                      id="share.publicNotifier.reportLink.reportingSectionUrlLinkLabel"
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
            id: 'share.modalContent.notification.reportingErrorTitle',
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
              id="share.modalContent.unsavedStateErrorText"
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
                data-test-subj="shareReportingCopyURL"
              >
                <FormattedMessage
                  id="share.modalContent.copyUrlButtonLabel"
                  defaultMessage="Post URL"
                />
              </EuiButtonEmpty>
            )}
          </EuiCopy>
        </EuiToolTip>
        <EuiToolTip
          content={
            <FormattedMessage
              id="share.modalContent.howToCallGenerationDescription"
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
              data-test-subj="shareReportingCopyURL"
            >
              <FormattedMessage
                id="share.modalContent.copyUrlButtonLabel"
                defaultMessage="Post URL  "
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
        <FormattedMessage id="share.csv.message" defaultMessage="Export a CSV of this search." />
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
              disabled={Boolean(createReportingJob)}
              onClick={() => generateReportingJob()}
              data-test-subj="generateReportButton"
              isLoading={Boolean(createReportingJob)}
            >
              <FormattedMessage id="share.generateButtonLabel" defaultMessage="Generate CSV" />
            </EuiButton>
          </EuiToolTip>
        ) : (
          <EuiButton
            disabled={Boolean(createReportingJob)}
            fill
            onClick={() => generateReportingJob()}
            data-test-subj="generateReportButton"
            isLoading={Boolean(createReportingJob)}
          >
            <FormattedMessage id="share.generateButtonLabel" defaultMessage="Generate CSV" />
          </EuiButton>
        )}
      </EuiModalFooter>
    </>
  );
};

export const CsvContent = injectI18n(CsvContentUi);
