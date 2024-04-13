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
  EuiFlexItem,
  EuiForm,
  EuiIcon,
  EuiRadioGroup,
  EuiSpacer,
  EuiSwitch,
  EuiSwitchEvent,
  EuiText,
  EuiToolTip,
} from '@elastic/eui';
import useMountedState from 'react-use/lib/useMountedState';
import { SupportedExportTypes, ShareMenuItemV2 } from '../../../types';
import { type IShareContext } from '../../context';

type ExportProps = Pick<IShareContext, 'isDirty' | 'objectId' | 'objectType' | 'onClose'> & {
  layoutOption?: 'print';
  aggregateReportTypes: ShareMenuItemV2[];
  intl: InjectedIntl;
};

interface ICopyPOSTUrlProps {
  unsavedChangesExist: boolean;
  postUrl?: string;
}

const CopyPOSTUrlButton = ({ unsavedChangesExist, postUrl }: ICopyPOSTUrlProps) => {
  return (
    <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
      <EuiFlexItem grow={false}>
        <EuiToolTip
          content={
            unsavedChangesExist ? (
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
          <EuiCopy textToCopy={postUrl ?? ''}>
            {(copy) => (
              <EuiButtonEmpty
                iconType="copy"
                onClick={copy}
                data-test-subj="shareReportingCopyURL"
                flush="both"
              >
                <FormattedMessage
                  id="share.modalContent.copyUrlButtonLabel"
                  defaultMessage="Post URL"
                />
              </EuiButtonEmpty>
            )}
          </EuiCopy>
        </EuiToolTip>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiToolTip
          content={
            <EuiText size="s">
              <FormattedMessage
                id="share.postURLWatcherMessage"
                defaultMessage="Copy this POST URL to call generation from outside Kibana or from Watcher."
              />
              {unsavedChangesExist && (
                <>
                  <EuiSpacer size="s" />
                  <FormattedMessage
                    id="share.postURLWatcherMessage.unsavedChanges"
                    defaultMessage="Unsaved changes: URL may change if you upgrade Kibana"
                  />
                </>
              )}
            </EuiText>
          }
        >
          <EuiIcon type="questionInCircle" />
        </EuiToolTip>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

const ExportContentUi = ({
  isDirty,
  objectType,
  aggregateReportTypes,
  intl,
  onClose,
}: ExportProps) => {
  // needed for CSV in Discover;
  const [selectedRadio, setSelectedRadio] = useState<SupportedExportTypes>(
    (aggregateReportTypes[0].reportType as SupportedExportTypes) ?? ('printablePdfV2' as const)
  );
  const [, setIsStale] = useState(false);
  const [isCreatingExport, setIsCreatingExport] = useState<boolean>(false);
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
    generateExportButton,
    helpText,
    renderCopyURLButton,
    generateExport,
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
              css={{ display: 'block' }}
              checked={usePrintLayout}
              onChange={handlePrintLayoutChange}
              data-test-subj="usePrintLayout"
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
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
      return <CopyPOSTUrlButton postUrl={absoluteUrl} unsavedChangesExist={isDirty} />;
  }, [absoluteUrl, isDirty, renderCopyURLButton]);

  const getReport = useCallback(async () => {
    try {
      setIsCreatingExport(true);
      await generateExport({ intl, optimizedForPrinting: usePrintLayout });
    } finally {
      setIsCreatingExport(false);
      onClose?.();
    }
  }, [generateExport, intl, usePrintLayout, onClose]);

  const renderGenerateReportButton = useCallback(() => {
    return (
      <EuiButton
        fill
        color="primary"
        onClick={getReport}
        data-test-subj="generateExportButton"
        isLoading={isCreatingExport}
      >
        {generateExportButton}
      </EuiButton>
    );
  }, [generateExportButton, getReport, isCreatingExport]);

  const renderRadioOptions = () => {
    if (getRadioOptions().length > 1) {
      return (
        <EuiFlexGroup direction="row" justifyContent={'spaceBetween'}>
          <EuiRadioGroup
            options={getRadioOptions()}
            onChange={(id) => {
              setSelectedRadio(id as SupportedExportTypes);
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

  const getHelpText = () => {
    if (objectType === 'lens' && generateExport !== undefined) {
      return helpText;
    } else {
      return (
        <FormattedMessage
          id="share.helpText.goldLicense.roleNotPDFPNG"
          defaultMessage="Export a CSV of this visualization."
        />
      );
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
        <>{renderLayoutOptionsSwitch()}</>
        <>{showCopyURLButton()}</>
        <>{renderGenerateReportButton()}</>
      </EuiFlexGroup>
    </>
  );
};

export const ExportContent = injectI18n(ExportContentUi);
