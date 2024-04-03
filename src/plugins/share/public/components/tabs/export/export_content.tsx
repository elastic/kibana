/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FormattedMessage, InjectedIntl } from '@kbn/i18n-react';
import type { ReportingAPIClient } from '@kbn/reporting-public';

import {
  EuiButton,
  EuiButtonEmpty,
  EuiCopy,
  EuiFlexGroup,
  EuiForm,
  EuiIcon,
  EuiModalFooter,
  EuiRadioGroup,
  EuiSpacer,
  EuiSwitch,
  EuiSwitchEvent,
  EuiText,
  EuiToolTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import useMountedState from 'react-use/lib/useMountedState';
import { toMountPoint } from '@kbn/react-kibana-mount';
import url from 'url';
import { LayoutParams } from '@kbn/screenshotting-plugin/common';
import { JobParamsProviderOptions } from '@kbn/reporting-public/share/share_context_menu';
import { BaseParams } from '@kbn/reporting-common/types';
import { ThemeServiceSetup, ToastsSetup } from '@kbn/core/public';
import { type IShareContext } from '../../context';

type ExportProps = Pick<
  IShareContext,
  'isDirty' | 'objectId' | 'objectType' | 'onClose' | 'i18n'
> & {
  reportingAPIClient: ReportingAPIClient;
  getJobParams: Function;
  helpText: FormattedMessage;
  generateReportButton: FormattedMessage;
  jobProviderOptions?: JobParamsProviderOptions;
  layoutOption?: 'print';
  toasts: ToastsSetup;
  theme: ThemeServiceSetup;
  downloadCSVLens: Function;
};

type AllowedExports = 'pngV2' | 'printablePdfV2' | 'csv';
type AppParams = Omit<BaseParams, 'browserTimezone' | 'version'>;
type Props = ExportProps & { intl: InjectedIntl };

export const ExportContent = ({
  getJobParams,
  theme,
  reportingAPIClient,
  helpText,
  isDirty,
  objectId,
  objectType,
  generateReportButton,
  jobProviderOptions,
  layoutOption,
  intl,
  toasts,
  onClose,
  downloadCSVLens,
  i18n: i18nStart,
}: Props) => {
  const isSaved = Boolean(objectId) || !isDirty;
  const [, setIsStale] = useState(false);
  const [isCreatingReport, setIsCreatingReport] = useState(false);
  const [selectedRadio, setSelectedRadio] = useState<AllowedExports>('printablePdfV2');
  const [usePrintLayout, setPrintLayout] = useState(false);
  const [absoluteUrl, setAbsoluteUrl] = useState('');
  const isMounted = useMountedState();

  const getJobsParamsForImageExports = useCallback(
    (type: AllowedExports, opts?: JobParamsProviderOptions) => {
      if (!opts) {
        return;
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
        window.location.origin + reportingAPIClient.getServerBasePath(),
        ''
      );

      // single URL for PNG
      return { ...baseParams, relativeUrl };
    },
    [reportingAPIClient, objectType]
  );

  const getLayout = useCallback((): LayoutParams => {
    const el = document.querySelector('[data-shared-items-container]');
    const { height, width } = el ? el.getBoundingClientRect() : { height: 768, width: 1024 };
    const dimensions = { height, width };

    if (usePrintLayout) {
      return { id: 'print', dimensions };
    }

    return { id: 'preserve_layout', dimensions };
  }, [usePrintLayout]);

  const getJobParamsImages = useCallback(
    (shareableUrl?: boolean) => {
      return {
        ...getJobsParamsForImageExports(selectedRadio, jobProviderOptions),
        layout: getLayout(),
      };
    },
    [getJobsParamsForImageExports, getLayout, jobProviderOptions, selectedRadio]
  );

  const getAbsoluteReportGenerationUrl = useMemo(
    () => () => {
      if (getJobsParamsForImageExports(selectedRadio, jobProviderOptions) !== undefined) {
        const relativePath = reportingAPIClient.getReportingPublicJobPath(
          selectedRadio,
          reportingAPIClient.getDecoratedJobParams(getJobParamsImages(true) as unknown as AppParams)
        );
        return setAbsoluteUrl(url.resolve(window.location.href, relativePath));
      }
    },
    [
      reportingAPIClient,
      getJobParamsImages,
      selectedRadio,
      getJobsParamsForImageExports,
      jobProviderOptions,
    ]
  );

  const markAsStale = useCallback(() => {
    if (!isMounted) return;
    setIsStale(true);
  }, [isMounted]);

  useEffect(() => {
    getAbsoluteReportGenerationUrl();
    markAsStale();
  }, [markAsStale, getAbsoluteReportGenerationUrl]);
  const handlePrintLayoutChange = (evt: EuiSwitchEvent) => {
    setPrintLayout(evt.target.checked);
  };

  const renderLayoutOptionsSwitch = () => {
    if (layoutOption === ('print' as const) && selectedRadio !== 'pngV2') {
      return (
        <>
          <EuiSwitch
            label={
              <EuiText size="s" css={{ textWrap: 'nowrap' }}>
                <FormattedMessage
                  id="reporting.screenCapturePanelContent.optimizeForPrintingLabel"
                  defaultMessage="For printing"
                />
              </EuiText>
            }
            css={{ display: 'block' }}
            checked={usePrintLayout}
            onChange={handlePrintLayoutChange}
            data-test-subj="usePrintLayout"
          />
          <EuiToolTip
            content={
              <FormattedMessage
                id="reporting.screenCapturePanelContent.optimizeForPrintingHelpText"
                defaultMessage="Uses multiple pages, showing at most 2 visualizations per page "
              />
            }
          >
            <EuiIcon type="questionInCircle" />
          </EuiToolTip>
        </>
      );
    }
  };
  const renderCopyURLButton = useCallback(() => {
    return (
      <>
        <EuiToolTip
          content={
            isDirty ? (
              <FormattedMessage
                id="reporting.share.modalContent.unsavedStateErrorText"
                defaultMessage="Save your work before copying this URL."
              />
            ) : (
              <FormattedMessage
                id="reporting.share.modalContent.savedStateErrorText"
                defaultMessage="Copy this POST URL to call generation from outside Kibana or from Watcher."
              />
            )
          }
        >
          <EuiCopy textToCopy={absoluteUrl}>
            {(copy) => (
              <EuiButtonEmpty
                iconType="copy"
                disabled={isDirty}
                flush="both"
                onClick={copy}
                data-test-subj="shareReportingCopyURL"
              >
                <FormattedMessage
                  id="reporting.share.modalContent.copyUrlButtonLabel"
                  defaultMessage="Post URL"
                />
              </EuiButtonEmpty>
            )}
          </EuiCopy>
        </EuiToolTip>
        <EuiToolTip
          content={
            <FormattedMessage
              id="reporting.share.postURLWatcherMessage"
              defaultMessage="Copy this POST URL to call generation from outside Kibana or from Watcher. Unsaved changes: URL may change if you upgrade Kibana"
            />
          }
        >
          <EuiIcon type="questionInCircle" />
        </EuiToolTip>
      </>
    );
  }, [absoluteUrl, isDirty]);

  const generateReportingJob = () => {
    if (selectedRadio === 'csv') {
      return downloadCSVLens();
    }
    const decoratedJobParams = reportingAPIClient.getDecoratedJobParams(
      getJobParams(false) as unknown as AppParams
    );
    setIsCreatingReport(true);
    return reportingAPIClient
      .createReportingJob(selectedRadio, decoratedJobParams)
      .then(() => {
        toasts.addSuccess({
          title: intl.formatMessage(
            {
              id: 'reporting.modalContent.successfullyQueuedReportNotificationTitle',
              defaultMessage: 'Queued report for {objectType}',
            },
            { objectType }
          ),
          text: toMountPoint(
            <FormattedMessage
              id="reporting.modalContent.successfullyQueuedReportNotificationDescription"
              defaultMessage="Track its progress in {path}."
              values={{
                path: (
                  <a href={reportingAPIClient.getManagementLink()}>
                    <FormattedMessage
                      id="reporting.modalContent.publicNotifier.reportLink.reportingSectionUrlLinkLabel"
                      defaultMessage="Stack Management &gt; Reporting"
                    />
                  </a>
                ),
              }}
            />,
            { theme, i18n: i18nStart }
          ),
          'data-test-subj': 'queueReportSuccess',
        });
        if (onClose) {
          onClose();
        }
        if (isMounted()) {
          setIsCreatingReport(false);
        }
      })
      .catch((error) => {
        toasts.addError(error, {
          title: intl.formatMessage({
            id: 'reporting.modalContent.notification.reportingErrorTitle',
            defaultMessage: 'Unable to create report',
          }),
          toastMessage: (
            // eslint-disable-next-line react/no-danger
            <span dangerouslySetInnerHTML={{ __html: error.body.message }} />
          ) as unknown as string,
        });
        if (isMounted()) {
          setIsCreatingReport(false);
        }
      });
  };

  const renderGenerateReportButton = !isSaved ? (
    <EuiToolTip
      content={i18n.translate('reporting.share.panelContent.unsavedStateErrorTitle', {
        defaultMessage: 'Unsaved work',
      })}
    >
      <EuiButton
        disabled={Boolean(isCreatingReport) || isDirty}
        data-test-subj="generateReportButton"
        isLoading={Boolean(isCreatingReport)}
      >
        {generateReportButton}
      </EuiButton>
    </EuiToolTip>
  ) : (
    <EuiButton
      disabled={Boolean(isCreatingReport) || isDirty}
      fill
      onClick={() => generateReportingJob()}
      data-test-subj="generateReportButton"
      isLoading={Boolean(isCreatingReport)}
    >
      {generateReportButton}
    </EuiButton>
  );

  const radioOptions =
    objectType === 'lens'
      ? [
          { id: 'printablePdfV2', label: 'PDF' },
          { id: 'pngV2', label: 'PNG', 'data-test-subj': 'pngReportOption' },
          { id: 'csv', label: 'CSV', 'data-test-subj': 'lensCSVReport' },
        ]
      : [
          { id: 'printablePdfV2', label: 'PDF' },
          { id: 'pngV2', label: 'PNG', 'data-test-subj': 'pngReportOption' },
        ];

  const renderRadioOptions = () => {
    if (objectType === 'dashboard' || objectType === 'lens') {
      return (
        <EuiFlexGroup direction="row" justifyContent={'spaceBetween'}>
          <EuiRadioGroup
            options={radioOptions}
            onChange={(id) => {
              setSelectedRadio(id as AllowedExports);
            }}
            name="image reporting radio group"
            idSelected={selectedRadio}
            legend={{
              children: (
                <FormattedMessage id="reporting.share.fileType" defaultMessage="File type" />
              ),
            }}
          />
        </EuiFlexGroup>
      );
    }
  };

  return objectType === 'lens' && !helpText ? null : (
    <>
      <EuiForm>
        <EuiSpacer size="l" />
        {helpText}
        <EuiSpacer size="m" />
        {renderRadioOptions()}
        <EuiSpacer size="xl" />
      </EuiForm>
      <EuiModalFooter // dashboard has three buttons in the footer and needs to have them in the footer
        css={
          selectedRadio === 'printablePdfV2' && objectType === 'dashboard'
            ? { justifyContent: 'center', alignItems: 'center' }
            : {}
        }
      >
        {renderLayoutOptionsSwitch()}
        {renderCopyURLButton()}
        {renderGenerateReportButton}
      </EuiModalFooter>
    </>
  );
};
