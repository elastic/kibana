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
  EuiFlexGroup,
  EuiForm,
  EuiFormRow,
  EuiIcon,
  EuiRadioGroup,
  EuiSpacer,
  EuiSwitch,
  EuiSwitchEvent,
  EuiToolTip,
} from '@elastic/eui';
import { injectI18n, InjectedIntl } from '@kbn/i18n-react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { getMaxUrlLength } from '@kbn/reporting-public/share/share_context_menu/reporting_panel_content/constants';
import { ErrorUrlTooLongPanel } from '@kbn/reporting-public/share/share_context_menu/reporting_panel_content/components';
import type { JobParamsProviderOptions } from '@kbn/reporting-public/share/share_context_menu';
import useMountedState from 'react-use/lib/useMountedState';
import { toMountPoint } from '@kbn/kibana-react-plugin/public';
import url from 'url';
import { BaseParams } from '@kbn/reporting-common/types';
import { LayoutParams } from '@kbn/screenshotting-plugin/common';
import { IShareContext } from '../../context';

type ExportProps = Pick<
  IShareContext,
  | 'layoutOption'
  | 'objectId'
  | 'isDirty'
  | 'apiClient'
  | 'getJobParams'
  | 'objectType'
  | 'jobProviderOptions'
  | 'toasts'
  | 'theme'
  | 'onClose'
> & {
  intl: InjectedIntl;
};

type AppParams = Omit<BaseParams, 'browserTimezone' | 'version'>;

type AllowedImageExportType = 'pngV2' | 'printablePdfV2';

export const ExportContentUi = ({
  layoutOption,
  objectId,
  isDirty,
  apiClient,
  getJobParams,
  objectType,
  jobProviderOptions,
  toasts,
  theme,
  intl,
  onClose,
}: ExportProps) => {
  // TODO: use share menu items to build export tab
  const [selectedRadio, setSelectedRadio] = useState<AllowedImageExportType>('printablePdfV2');
  const [createReportingJob, setCreatingReportJob] = useState(false);
  const [usePrintLayout, setPrintLayout] = useState(false);
  const [absoluteUrl, setAbsoluteUrl] = useState('');
  const [isStale, setIsStale] = useState(false);
  const isMounted = useMountedState();
  const isSaved = Boolean(objectId);
  const exceedsMaxLength = absoluteUrl.length >= getMaxUrlLength();

  const markAsStale = useCallback(() => {
    if (!isMounted) return;
    setIsStale(true);
  }, [isMounted]);

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
    if (usePrintLayout) {
      return { id: 'print', dimensions };
    }

    return { id: 'preserve_layout', dimensions };
  }, [usePrintLayout]);

  const getJobParamsHelper = useCallback(
    (shareableUrl?: boolean) => {
      return { ...getJobsParams(selectedRadio, jobProviderOptions), layout: getLayout() };
    },
    [getJobsParams, getLayout, jobProviderOptions, selectedRadio]
  );

  const getAbsoluteReportGenerationUrl = useMemo(
    () => () => {
      if (getJobsParams(selectedRadio, jobProviderOptions) !== undefined) {
        const relativePath = apiClient.getReportingPublicJobPath(
          selectedRadio,
          apiClient.getDecoratedJobParams(getJobParamsHelper(true) as unknown as AppParams)
        );
        return setAbsoluteUrl(url.resolve(window.location.href, relativePath));
      }
    },
    [apiClient, selectedRadio, jobProviderOptions, getJobParamsHelper, getJobsParams]
  );

  useEffect(() => {
    getAbsoluteReportGenerationUrl();
    markAsStale();
  }, [markAsStale, getAbsoluteReportGenerationUrl]);

  const generateReportingJob = () => {
    const decoratedJobParams = apiClient.getDecoratedJobParams(
      getJobParamsHelper(false) as unknown as AppParams
    );
    setCreatingReportJob(true);
    return apiClient
      .createReportingJob(selectedRadio, decoratedJobParams)
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
        if (isMounted()) {
          setCreatingReportJob(false);
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
        if (isMounted()) {
          setCreatingReportJob(false);
        }
      });
  };

  const handlePrintLayoutChange = (evt: EuiSwitchEvent) => {
    setPrintLayout(evt.target.checked);
  };

  const renderOptions = () => {
    if (layoutOption === 'print' && selectedRadio !== 'pngV2') {
      return (
        <>
          <EuiSwitch
            label={
              <FormattedMessage
                id="xpack.reporting.screenCapturePanelContent.optimizeForPrintingLabel"
                defaultMessage="Optimize for printing"
              />
            }
            checked={usePrintLayout}
            onChange={handlePrintLayoutChange}
            data-test-subj="usePrintLayout"
          />
          <EuiToolTip
            content={
              <FormattedMessage
                id="xpack.reporting.screenCapturePanelContent.optimizeForPrintingHelpText"
                defaultMessage="Uses multiple pages, showing at most 2 visualizations per page "
              />
            }
          >
            <EuiIcon type="questionInCircle" />
          </EuiToolTip>
        </>
      );
    }
    return null;
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
        {isUnsaved && (
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
        )}
        <EuiToolTip
          content={
            isSaved ? (
              <FormattedMessage
                id="reporting.modalContent.postUrl"
                defaultMessage="Copy this POST URL to call generation from outside Kibana or from Watcher."
              />
            ) : (
              <FormattedMessage
                id="reporting.modalContent.postUrl"
                defaultMessage="Copy this POST URL to call generation from outside Kibana or from Watcher.  Unsaved changes: URL may change if you upgrade Kibana"
              />
            )
          }
        >
          <EuiIcon type="questionInCircle" />
        </EuiToolTip>
      </>
    );
  };

  const saveWarningMessageWithButton =
    objectId === undefined || objectId === '' || !isSaved || isDirty || isStale ? (
      <EuiFormRow>
        <EuiToolTip content="Please save your work before generating a report.">
          <EuiButton
            disabled={Boolean(createReportingJob)}
            fill
            onClick={() => generateReportingJob()}
            data-test-subj="generateReportButton"
            isLoading={Boolean(createReportingJob)}
          >
            <FormattedMessage
              id="xpack.reporting.modalContent.generateButtonLabel"
              defaultMessage="Generate export"
            />
          </EuiButton>
        </EuiToolTip>
      </EuiFormRow>
    ) : (
      <EuiButton
        disabled={Boolean(createReportingJob)}
        fill
        onClick={() => generateReportingJob()}
        data-test-subj="generateReportButton"
        isLoading={Boolean(createReportingJob)}
      >
        <FormattedMessage
          id="xpack.reporting.generateReportButtonLabel"
          defaultMessage="Generate export"
        />
      </EuiButton>
    );

  return (
    <>
      <EuiForm className="kbnShareContextMenu__finalPanel" data-test-subj="shareReportingForm">
        <FormattedMessage
          id="reporting.share.imageExport"
          defaultMessage="Exports can take a few minutes to generate."
        />
        <EuiSpacer size="m" />
        <EuiFlexGroup direction="row" justifyContent={'spaceBetween'}>
          <EuiRadioGroup
            options={[
              { id: 'printablePdfV2', label: 'PDF' },
              { id: 'pngV2', label: 'PNG', 'data-test-subj': 'pngReportOption' },
            ]}
            onChange={(id) => {
              setSelectedRadio(id as Exclude<AllowedImageExportType, 'printablePdfV2'>);
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
        <EuiSpacer size="m" />
      </EuiForm>
      {/* <EuiModalFooter>
        {renderOptions()}
        {renderCopyURLButton({ isUnsaved: !isSaved, exceedsMaxLength })}
        {saveWarningMessageWithButton}
      </EuiModalFooter> */}
    </>
  );
};

export const ExportContent = injectI18n(ExportContentUi);
