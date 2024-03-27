/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  EuiButton,
  EuiIcon,
  EuiButtonEmpty,
  EuiCopy,
  EuiFlexGroup,
  EuiForm,
  EuiFormRow,
  EuiModalFooter,
  EuiRadioGroup,
  EuiSpacer,
  EuiSwitch,
  EuiSwitchEvent,
  EuiToolTip,
} from '@elastic/eui';
import type { IUiSettingsClient, ThemeServiceSetup, ToastsSetup } from '@kbn/core/public';
import { FormattedMessage, InjectedIntl, injectI18n } from '@kbn/i18n-react';
import url from 'url';
import React, { FC, useCallback, useEffect, useState, useMemo } from 'react';
import useMountedState from 'react-use/lib/useMountedState';
import { LayoutParams } from '@kbn/screenshotting-plugin/common';
import type { JobAppParamsPDFV2 } from '@kbn/reporting-export-types-pdf-common';
import { BaseParams } from '@kbn/reporting-common/types';
import { toMountPoint } from '@kbn/kibana-react-plugin/public';
import { ReportingAPIClient } from '../..';
import { JobParamsProviderOptions } from '.';
import { ErrorUrlTooLongPanel } from './reporting_panel_content/components';
import { getMaxUrlLength } from './reporting_panel_content/constants';

export interface ReportingModalProps {
  apiClient: ReportingAPIClient;
  toasts: ToastsSetup;
  uiSettings: IUiSettingsClient;
  reportType?: string;
  requiresSavedState: boolean; // Whether the report to be generated requires saved state that is not captured in the URL submitted to the report generator.
  objectId?: string;
  isDirty?: boolean;
  onClose: () => void;
  theme: ThemeServiceSetup;
  layoutOption?: 'print' | 'canvas';
  // canvas breaks if required
  jobProviderOptions?: JobParamsProviderOptions;
  // needed for canvas
  getJobParams?: JobAppParamsPDFV2;
  objectType: string;
  downloadCsvFromLens: () => void;
}

type AppParams = Omit<BaseParams, 'browserTimezone' | 'version'>;

export type Props = ReportingModalProps & { intl: InjectedIntl };

type AllowedImageExportType = 'pngV2' | 'printablePdfV2' | 'printablePdf';

export const ReportingModalContentUI: FC<Props> = (props: Props) => {
  const {
    apiClient,
    intl,
    toasts,
    theme,
    onClose,
    objectId,
    layoutOption,
    jobProviderOptions,
    objectType,
  } = props;
  const isSaved = Boolean(objectId);
  const [isStale, setIsStale] = useState(false);
  const [createReportingJob, setCreatingReportJob] = useState(false);
  const [selectedRadio, setSelectedRadio] = useState<AllowedImageExportType>('printablePdfV2');
  const [usePrintLayout, setPrintLayout] = useState(false);
  const [absoluteUrl, setAbsoluteUrl] = useState('');
  const isMounted = useMountedState();
  const exceedsMaxLength = absoluteUrl.length >= getMaxUrlLength();

  const getJobsParams = useCallback(
    (type: AllowedImageExportType, opts?: JobParamsProviderOptions) => {
      if (!opts) {
        return { ...props.getJobParams };
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

      if (type === 'printablePdf') {
        // multi URL for PDF
        return { ...baseParams, relativeUrls: [relativeUrl] };
      }

      // single URL for PNG
      return { ...baseParams, relativeUrl };
    },
    [apiClient, objectType, props.getJobParams]
  );

  const getLayout = useCallback((): LayoutParams => {
    const { layout } = getJobsParams(selectedRadio, jobProviderOptions);

    let dimensions = layout?.dimensions;

    if (!dimensions) {
      const el = document.querySelector('[data-shared-items-container]');
      const { height, width } = el ? el.getBoundingClientRect() : { height: 768, width: 1024 };
      dimensions = { height, width };
    }
    if (usePrintLayout) {
      return { id: 'print', dimensions };
    }

    return { id: 'preserve_layout', dimensions };
  }, [getJobsParams, jobProviderOptions, selectedRadio, usePrintLayout]);

  const getJobParams = useCallback(
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
          apiClient.getDecoratedJobParams(getJobParams(true) as unknown as AppParams)
        );
        return setAbsoluteUrl(url.resolve(window.location.href, relativePath));
      }
    },
    [apiClient, getJobParams, selectedRadio, getJobsParams, jobProviderOptions]
  );

  const markAsStale = useCallback(() => {
    if (!isMounted) return;
    setIsStale(true);
  }, [isMounted]);

  useEffect(() => {
    getAbsoluteReportGenerationUrl();
    markAsStale();
  }, [markAsStale, getAbsoluteReportGenerationUrl]);

  const generateReportingJob = () => {
    const decoratedJobParams = apiClient.getDecoratedJobParams(
      getJobParams(false) as unknown as AppParams
    );
    setCreatingReportJob(true);
    return apiClient
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
                  <a href={apiClient.getManagementLink()}>
                    <FormattedMessage
                      id="reporting.modalContent.publicNotifier.reportLink.reportingSectionUrlLinkLabel"
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
            id: 'reporting.modalContent.notification.reportingErrorTitle',
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
                id="reporting.screenCapturePanelContent.optimizeForPrintingLabel"
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
                disabled={!isSaved}
                flush="both"
                onClick={copy}
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
              id="reporting.share.postURLWatcherMessage"
              defaultMessage="Copy this POST URL to call generation from outside Kibana or from Watcher. Unsaved changes: URL may change if you upgrade Kibana"
            />
          }
        >
          <EuiIcon type="questionInCircle" />
        </EuiToolTip>
      </>
    );
  };

  const saveWarningMessageWithButton =
    objectId === undefined || objectId === '' || !isSaved || props.isDirty || isStale ? (
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
              id="reporting.modalContent.generateButtonLabel"
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
          id="reporting.share.generateReportButtonLabel"
          defaultMessage="Generate export"
        />
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
            options={radioOptions}
            onChange={(id) => {
              setSelectedRadio(id as Exclude<AllowedImageExportType, 'printablePdf'>);
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
      <EuiModalFooter>
        {renderOptions()}
        {renderCopyURLButton({ isUnsaved: !isSaved, exceedsMaxLength })}
        {saveWarningMessageWithButton}
      </EuiModalFooter>
    </>
  );
};

export const ReportingModalContent = injectI18n(ReportingModalContentUI);
