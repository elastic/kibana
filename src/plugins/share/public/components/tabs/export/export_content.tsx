/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { FormattedMessage, injectI18n } from '@kbn/i18n-react';

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
// import useMountedState from 'react-use/lib/useMountedState';
import { type IShareContext } from '../../context';

type ExportProps = Pick<
  IShareContext,
  'isDirty' | 'objectId' | 'objectType' | 'onClose' | 'intl' | 'toasts'
> & {
  layoutOption?: 'print';
  aggregateReportTypes: any[];
};

type AllowedExports = 'pngV2' | 'printablePdfV2' | 'csv_v2' | 'csv_searchsource' | 'csv';

const ExportContentUi = ({
  isDirty,
  objectId,
  objectType,
  aggregateReportTypes,
  layoutOption,
  intl,
  toasts,
}: ExportProps) => {
  const isSaved = Boolean(objectId) || !isDirty;
  // needed for CSV in Discover
  const firstRadio = aggregateReportTypes[0].reportType;
  // const [, setIsStale] = useState(false);
  const [isCreatingReport] = useState(false);
  const [selectedRadio, setSelectedRadio] = useState<AllowedExports>(firstRadio);
  const [usePrintLayout, setPrintLayout] = useState(false);
  // const isMounted = useMountedState();

  const getProperties = useCallback(() => {
    if (objectType === 'search') {
      return aggregateReportTypes[0];
    } else {
      return aggregateReportTypes?.filter(({ reportType }) => reportType === selectedRadio)[0];
    }
  }, [selectedRadio, aggregateReportTypes, objectType]);

  const {
    generateReportButton,
    helpText,
    renderCopyURLButton,
    generateReport,
    generateReportForPrinting,
    downloadCSVLens,
    absoluteUrl,
    renderLayoutOptionSwitch,
    showRadios,
  } = getProperties();

  const getRadioOptions = useCallback(
    () =>
      aggregateReportTypes.map(({ reportType, label }) => {
        return { id: reportType, label, 'data-test-subj': `${reportType}-radioOption` };
      }),
    [aggregateReportTypes]
  );

  const renderLayoutOptionsSwitch = useCallback(() => {
    if (renderLayoutOptionSwitch) {
      return (
        <>
          <EuiSwitch
            label={
              <EuiText size="s" css={{ textWrap: 'nowrap' }}>
                <FormattedMessage
                  id="share.screenCapturePanelContent.optimizeForPrintingLabel"
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
                id="share.screenCapturePanelContent.optimizeForPrintingHelpText"
                defaultMessage="Uses multiple pages, showing at most 2 visualizations per page "
              />
            }
          >
            <EuiIcon type="questionInCircle" />
          </EuiToolTip>
        </>
      );
    }
  }, [usePrintLayout, renderLayoutOptionSwitch]);

  useEffect(() => {
    getRadioOptions();
    renderLayoutOptionsSwitch();
    getProperties();
  }, [aggregateReportTypes, getProperties, getRadioOptions, renderLayoutOptionsSwitch]);

  // const markAsStale = useCallback(() => {
  //   if (!isMounted) return;
  //   setIsStale(true);
  // }, [isMounted]);

  const handlePrintLayoutChange = (evt: EuiSwitchEvent) => {
    setPrintLayout(evt.target.checked);
  };

  const showCopyURLButton = useCallback(() => {
    if (renderCopyURLButton)
      return (
        <>
          <EuiToolTip
            content={
              isDirty ? (
                <FormattedMessage
                  id="share.modalContent.unsavedStateErrorText"
                  defaultMessage="Save your work before copying this URL."
                />
              ) : (
                <FormattedMessage
                  id="share.modalContent.savedStateErrorText"
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
                id="share.postURLWatcherMessage"
                defaultMessage="Copy this POST URL to call generation from outside Kibana or from Watcher. Unsaved changes: URL may change if you upgrade Kibana"
              />
            }
          >
            <EuiIcon type="questionInCircle" />
          </EuiToolTip>
        </>
      );
  }, [absoluteUrl, isDirty, renderCopyURLButton]);

  const getReport = useCallback(() => {
    if (objectType === 'lens' && selectedRadio === 'csv') {
      return downloadCSVLens();
    }
    return usePrintLayout
      ? generateReportForPrinting({ intl, toasts })
      : generateReport({ intl, toasts });
  }, [
    intl,
    toasts,
    downloadCSVLens,
    generateReport,
    generateReportForPrinting,
    objectType,
    selectedRadio,
    usePrintLayout,
  ]);

  const renderGenerateReportButton = useCallback(() => {
    return !isSaved ? (
      <EuiToolTip
        content={i18n.translate('share.panelContent.unsavedStateErrorTitle', {
          defaultMessage: 'Unsaved work',
        })}
      >
        <EuiButton
          disabled={!isSaved}
          data-test-subj="generateReportButton"
          isLoading={Boolean(isCreatingReport)}
        >
          {generateReportButton}
        </EuiButton>
      </EuiToolTip>
    ) : (
      <EuiButton
        disabled={!isSaved}
        fill
        onClick={() => getReport()}
        data-test-subj="generateReportButton"
        isLoading={Boolean(isCreatingReport)}
      >
        {generateReportButton}
      </EuiButton>
    );
  }, [isSaved, generateReportButton, getReport, isCreatingReport]);

  const renderRadioOptions = () => {
    if (showRadios) {
      return (
        <EuiFlexGroup direction="row" justifyContent={'spaceBetween'}>
          <EuiRadioGroup
            options={getRadioOptions()}
            onChange={(id) => {
              setSelectedRadio(id as AllowedExports);
            }}
            name="image reporting radio group"
            idSelected={selectedRadio}
            legend={{
              children: <FormattedMessage id="share.fileType" defaultMessage="File type" />,
            }}
          />
        </EuiFlexGroup>
      );
    }
  };

  return (
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
          selectedRadio === 'printablePdfV2' &&
          (objectType === 'dashboard' || objectType === 'lens')
            ? { justifyContent: 'center', alignItems: 'center' }
            : {}
        }
      >
        {renderLayoutOptionsSwitch()}
        {showCopyURLButton()}
        {renderGenerateReportButton()}
      </EuiModalFooter>
    </>
  );
};

export const ExportContent = injectI18n(ExportContentUi);
