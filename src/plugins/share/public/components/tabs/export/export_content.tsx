/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { FormattedMessage, InjectedIntl, injectI18n } from '@kbn/i18n-react';

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
import useMountedState from 'react-use/lib/useMountedState';
import { ShareMenuItem } from '../../../types';
import { type IShareContext } from '../../context';

type ExportProps = Pick<IShareContext, 'isDirty' | 'objectId' | 'objectType' | 'onClose'> & {
  layoutOption?: 'print';
  aggregateReportTypes: ShareMenuItem[];
  intl: InjectedIntl;
};

type AllowedExports = 'pngV2' | 'printablePdfV2' | 'csv_v2' | 'csv_searchsource' | 'lens_csv';

const ExportContentUi = ({ isDirty, objectType, aggregateReportTypes, intl }: ExportProps) => {
  // needed for CSV in Discover
  const firstRadio =
    (aggregateReportTypes[0].reportType as AllowedExports) ?? ('printablePdfV2' as const);
  const [, setIsStale] = useState(false);
  const [isCreatingReport, setIsCreatingReport] = useState<boolean>(false);
  const [selectedRadio, setSelectedRadio] = useState<AllowedExports>(firstRadio);
  const [usePrintLayout, setPrintLayout] = useState(false);
  const isMounted = useMountedState();

  const markAsStale = useCallback(() => {
    if (!isMounted) return;
    setIsStale(true);
  }, [isMounted]);

  const getProperties = useCallback(() => {
    if (objectType === 'search') {
      return aggregateReportTypes[0];
    } else {
      return aggregateReportTypes?.filter(({ reportType }) => reportType === selectedRadio)[0];
    }
  }, [selectedRadio, aggregateReportTypes, objectType]);

  const handlePrintLayoutChange = useCallback(
    (evt: EuiSwitchEvent) => {
      setPrintLayout(evt.target.checked);
      getProperties();
    },
    [setPrintLayout, getProperties]
  );

  const {
    generateReportButton,
    helpText,
    renderCopyURLButton,
    generateReport,
    generateReportForPrinting,
    downloadCSVLens,
    absoluteUrl,
    renderLayoutOptionSwitch,
  } = getProperties();

  const getRadioOptions = useCallback(() => {
    if (!aggregateReportTypes.length) {
      throw new Error('No content registered for this tab');
    }
    return aggregateReportTypes.map(({ reportType, label }) => {
      if (reportType == null) {
        throw new Error('expected reportType to be string!');
      }
      return { id: reportType, label, 'data-test-subj': `${reportType}-radioOption` };
    });
  }, [aggregateReportTypes]);

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
  }, [usePrintLayout, renderLayoutOptionSwitch, handlePrintLayoutChange]);

  useEffect(() => {
    isMounted();
    getRadioOptions();
    renderLayoutOptionsSwitch();
    getProperties();
    markAsStale();
  }, [
    aggregateReportTypes,
    getProperties,
    getRadioOptions,
    renderLayoutOptionsSwitch,
    markAsStale,
    isMounted,
  ]);

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
    if (!generateReportForPrinting && !generateReport && !downloadCSVLens) {
      throw new Error('Report cannot be run due to no generate report method registered');
    }
    if (objectType === 'lens' && selectedRadio === 'lens_csv') {
      return downloadCSVLens!();
    }
    return usePrintLayout ? generateReportForPrinting!({ intl }) : generateReport!({ intl });
  }, [
    downloadCSVLens,
    generateReport,
    generateReportForPrinting,
    objectType,
    selectedRadio,
    usePrintLayout,
    intl,
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
    if (getRadioOptions().length > 1) {
      return (
        <EuiFlexGroup direction="row" justifyContent={'spaceBetween'}>
          <EuiRadioGroup
            options={getRadioOptions()}
            onChange={(id) => {
              setSelectedRadio(id as AllowedExports);
              getProperties();
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

  const styling =
    selectedRadio === 'printablePdfV2' &&
    (objectType === 'dashboard' || objectType === 'visualizations')
      ? { justifyContent: 'center', alignItems: 'center' }
      : {};

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
        css={{ padding: 0, ...styling }}
      >
        {renderLayoutOptionsSwitch()}
        {showCopyURLButton()}
        {renderGenerateReportButton()}
      </EuiModalFooter>
    </>
  );
};

export const ExportContent = injectI18n(ExportContentUi);
