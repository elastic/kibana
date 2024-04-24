/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useCallback, useEffect, useState, useMemo } from 'react';
import { FormattedMessage, InjectedIntl, injectI18n } from '@kbn/i18n-react';

import {
  EuiButton,
  EuiButtonEmpty,
  EuiCopy,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiIcon,
  EuiRadioGroup,
  EuiSpacer,
  EuiSwitch,
  EuiSwitchEvent,
  EuiText,
  EuiToolTip,
  type EuiRadioGroupOption,
} from '@elastic/eui';
import useMountedState from 'react-use/lib/useMountedState';
import { ShareMenuItem } from '../../../types';
import { type IShareContext } from '../../context';

type ExportProps = Pick<IShareContext, 'isDirty' | 'objectId' | 'objectType' | 'onClose'> & {
  layoutOption?: 'print';
  aggregateReportTypes: ShareMenuItem[];
  intl: InjectedIntl;
};

type AllowedExports = 'pngV2' | 'printablePdfV2' | 'csv_v2' | 'csv_searchsource' | 'csv';

const ExportContentUi = ({ isDirty, objectType, aggregateReportTypes, intl }: ExportProps) => {
  const [, setIsStale] = useState(false);
  const [isCreatingReport, setIsCreatingReport] = useState<boolean>(false);
  const [usePrintLayout, setPrintLayout] = useState(false);
  const isMounted = useMountedState();

  const markAsStale = useCallback(() => {
    if (!isMounted) return;
    setIsStale(true);
  }, [isMounted]);

  const radioOptions = useMemo(() => {
    return aggregateReportTypes
      .filter(({ reportType }) => reportType)
      .map(({ reportType, label }) => {
        return { id: reportType, label, 'data-test-subj': `${reportType}-radioOption` };
      }) as EuiRadioGroupOption[];
  }, [aggregateReportTypes]);

  const [selectedRadio, setSelectedRadio] = useState<AllowedExports>(
    radioOptions[0].id as AllowedExports
  );

  const {
    generateReportButton,
    generateReportForPrinting,
    helpText,
    renderCopyURLButton,
    generateReport,
    downloadCSVLens,
    absoluteUrl,
    renderLayoutOptionSwitch,
  } = useMemo(() => {
    return aggregateReportTypes?.find(({ reportType }) => reportType === selectedRadio) ?? {};
  }, [selectedRadio, aggregateReportTypes]);

  const handlePrintLayoutChange = useCallback(
    (evt: EuiSwitchEvent) => {
      setPrintLayout(evt.target.checked);
    },
    [setPrintLayout]
  );

  const renderLayoutOptionsSwitch = useCallback(() => {
    if (renderLayoutOptionSwitch) {
      return (
        <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiSwitch
              label={
                <EuiText size="s" css={{ textWrap: 'nowrap' }}>
                  <FormattedMessage
                    id="share.screenCapturePanelContent.optimizeForPrintingLabel"
                    defaultMessage="For printing"
                  />
                </EuiText>
              }
              checked={usePrintLayout}
              onChange={handlePrintLayoutChange}
              data-test-subj="usePrintLayout"
            />
          </EuiFlexItem>
          <EuiFlexItem>
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
          </EuiFlexItem>
        </EuiFlexGroup>
      );
    }
  }, [usePrintLayout, renderLayoutOptionSwitch, handlePrintLayoutChange]);

  useEffect(() => {
    isMounted();
    renderLayoutOptionsSwitch();
    markAsStale();
  }, [aggregateReportTypes, renderLayoutOptionsSwitch, markAsStale, isMounted]);

  const showCopyURLButton = useCallback(() => {
    if (renderCopyURLButton)
      return (
        <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
          <EuiFlexItem grow={false}>
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
              <EuiCopy textToCopy={absoluteUrl ?? ''}>
                {(copy) => (
                  <EuiButtonEmpty
                    iconType="copy"
                    flush="both"
                    onClick={copy}
                    data-test-subj="shareReportingCopyURL"
                  >
                    <EuiToolTip
                      id="share.savePostURLMessage"
                      content="Unsaved changes. This URL will not reflect later saved changes unless you save."
                    >
                      <FormattedMessage
                        id="share.modalContent.copyUrlButtonLabel"
                        defaultMessage="Post URL"
                      />
                    </EuiToolTip>
                  </EuiButtonEmpty>
                )}
              </EuiCopy>
            </EuiToolTip>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
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
          </EuiFlexItem>
        </EuiFlexGroup>
      );
  }, [absoluteUrl, isDirty, renderCopyURLButton]);

  const getReport = useCallback(() => {
    if (!generateReport && !downloadCSVLens) {
      throw new Error('Report cannot be run due to no generate report method registered');
    }
    if (objectType === 'lens' && selectedRadio === 'csv') {
      return downloadCSVLens!();
    } else if (usePrintLayout && selectedRadio === 'pngV2') {
      return generateReport!({ intl });
    }
    return usePrintLayout ? generateReportForPrinting!({ intl }) : generateReport!({ intl });
  }, [
    downloadCSVLens,
    generateReport,
    objectType,
    selectedRadio,
    usePrintLayout,
    intl,
    generateReportForPrinting,
  ]);

  const renderGenerateReportButton = useCallback(() => {
    return (
      <EuiButton
        fill
        color="primary"
        onClick={() => {
          setIsCreatingReport(true);
          getReport();
          setIsCreatingReport(false);
        }}
        data-test-subj="generateReportButton"
        isLoading={Boolean(isCreatingReport)}
      >
        {generateReportButton}
      </EuiButton>
    );
  }, [generateReportButton, getReport, isCreatingReport]);

  const renderRadioOptions = () => {
    if (radioOptions.length > 1) {
      return (
        <EuiFlexGroup direction="row" justifyContent={'spaceBetween'}>
          <EuiRadioGroup
            options={radioOptions}
            onChange={(id) => setSelectedRadio(id as AllowedExports)}
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

  const getHelpText = () => {
    if (objectType === 'lens' && generateReport !== undefined) {
      return helpText;
    } else if (objectType === 'lens') {
      return (
        <FormattedMessage
          id="share.helpText.goldLicense.roleNotPDFPNG"
          defaultMessage="Export a CSV of this visualization."
        />
      );
    } else {
      return helpText;
    }
  };

  return (
    <>
      <EuiForm>
        <EuiSpacer size="l" />
        {getHelpText()}
        <EuiSpacer size="m" />
        {renderRadioOptions()}
        <EuiSpacer size="xl" />
      </EuiForm>
      <EuiFlexGroup justifyContent="flexEnd" responsive={false}>
        {renderLayoutOptionsSwitch()}
        {showCopyURLButton()}
        {renderGenerateReportButton()}
      </EuiFlexGroup>
    </>
  );
};

export const ExportContent = injectI18n(ExportContentUi);
