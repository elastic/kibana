/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { type FC, useState, Fragment, useMemo, useCallback, useEffect } from 'react';
import {
  EuiWrappingPopover,
  EuiListGroup,
  EuiListGroupItem,
  EuiFlyout,
  EuiFlyoutHeader,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFormRow,
  EuiText,
  EuiTitle,
  EuiButton,
  EuiButtonEmpty,
  EuiCodeBlock,
  EuiFlexGroup,
  EuiFlexItem,
  EuiToolTip,
  type EuiSwitchEvent,
  EuiSwitch,
  EuiCallOut,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage, InjectedIntl, injectI18n } from '@kbn/i18n-react';
import { ShareMenuProvider, type IShareContext, useShareTabsContext } from './context';
import { ExportShareConfig } from '../types';

export const ExportMenu: FC<{ shareContext: IShareContext }> = ({ shareContext }) => {
  return (
    <ShareMenuProvider {...{ shareContext }}>
      <Fragment>{React.createElement(injectI18n(ExportMenuPopover))}</Fragment>
    </ShareMenuProvider>
  );
};

interface ExportMenuProps {
  intl: InjectedIntl;
}

interface LayoutOptionsProps {
  usePrintLayout: boolean;
  printLayoutChange: (evt: EuiSwitchEvent) => void;
}

function LayoutOptionsSwitch({ usePrintLayout, printLayoutChange }: LayoutOptionsProps) {
  return (
    <EuiFlexGroup direction="column" gutterSize="xs" responsive={false}>
      <EuiFlexItem grow={false}>
        <EuiFormRow
          label={
            <EuiText size="s">
              <h4>
                <FormattedMessage
                  id="share.exportFlyoutContent.optimizeForPrinting.label"
                  defaultMessage="Print format"
                />
              </h4>
            </EuiText>
          }
          helpText={
            <EuiText size="s" color="subdued">
              <FormattedMessage
                id="share.exportFlyoutContent.optimizeForPrinting.helpText"
                defaultMessage="Uses multiple pages, showing at most 2 visualizations per page "
              />
            </EuiText>
          }
          fullWidth
        >
          <EuiSwitch
            label={
              <EuiText size="s">
                {usePrintLayout ? (
                  <FormattedMessage
                    id="share.exportFlyoutContent.optimizeForPrinting.selection.on"
                    defaultMessage="On"
                  />
                ) : (
                  <FormattedMessage
                    id="share.exportFlyoutContent.optimizeForPrinting.selection.off"
                    defaultMessage="Off"
                  />
                )}
              </EuiText>
            }
            checked={usePrintLayout}
            onChange={printLayoutChange}
            data-test-subj="usePrintLayout"
          />
        </EuiFormRow>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}

function ExportMenuPopover({ intl }: ExportMenuProps) {
  const { onClose, anchorElement, shareMenuItems, isDirty, publicAPIEnabled, objectType } =
    useShareTabsContext('integration', 'export');
  const [isFlyoutVisible, setIsFlyoutVisible] = useState(false);
  const [isCreatingExport, setIsCreatingExport] = useState<boolean>(false);
  const [selectedMenuItemId, setSelectedMenuItemId] = useState<string>();
  const selectedMenuItem = useMemo<ExportShareConfig | null>(() => {
    return shareMenuItems.find((item) => item.id === selectedMenuItemId) ?? null;
  }, [shareMenuItems, selectedMenuItemId]);
  const [usePrintLayout, setPrintLayout] = useState(false);

  const getReport = useCallback(async () => {
    try {
      setIsCreatingExport(true);
      await selectedMenuItem?.config.generateAssetExport({
        intl,
        optimizedForPrinting: usePrintLayout,
      });
    } finally {
      setIsCreatingExport(false);
      onClose?.();
    }
  }, [intl, onClose, selectedMenuItem?.config, usePrintLayout]);

  useEffect(() => {
    // when there is only one share menu item,
    // we want to open the flyout and not the popover
    if (shareMenuItems.length === 1) {
      setSelectedMenuItemId(shareMenuItems[0].id);
      setIsFlyoutVisible(true);
    }
  }, [shareMenuItems]);

  const flyoutOnCloseHandler = useCallback(() => {
    return shareMenuItems.length === 1 ? onClose() : setIsFlyoutVisible(false);
  }, [onClose, shareMenuItems.length]);

  return (
    <Fragment>
      <EuiWrappingPopover
        isOpen={!isFlyoutVisible}
        data-test-subj="exportPopover"
        button={anchorElement!}
        closePopover={onClose}
        panelPaddingSize="none"
      >
        <EuiListGroup>
          {shareMenuItems.map((menuItem) => (
            <EuiToolTip
              position="left"
              content={selectedMenuItem?.config.toolTipContent}
              key={menuItem.id}
            >
              <EuiListGroupItem
                iconType={menuItem.config.icon}
                key={menuItem.id}
                label={menuItem.config.label}
                data-test-subj={`exportMenuItem-${menuItem.config.label}`}
                isDisabled={menuItem.config.disabled}
                onClick={() => {
                  setSelectedMenuItemId(menuItem.id);
                  setIsFlyoutVisible(true);
                }}
              />
            </EuiToolTip>
          ))}
        </EuiListGroup>
      </EuiWrappingPopover>
      {isFlyoutVisible && (
        <EuiFlyout
          data-test-subj="exportItemDetailsFlyout"
          size="s"
          onClose={flyoutOnCloseHandler}
          css={() => ({
            ['--euiFixedHeadersOffset']: 0,
          })}
          ownFocus
          maskProps={{
            headerZindexLocation: 'above',
          }}
        >
          <EuiFlyoutHeader hasBorder>
            <EuiTitle>
              <h2>
                <FormattedMessage
                  id="share.export.flyoutTitle"
                  defaultMessage="Export {objectType} as {type}"
                  values={{ objectType, type: selectedMenuItem?.config.label }}
                />
              </h2>
            </EuiTitle>
          </EuiFlyoutHeader>
          <EuiFlyoutBody>
            <EuiFlexGroup direction="column">
              <Fragment>
                {selectedMenuItem?.config.renderLayoutOptionSwitch && (
                  <EuiFlexItem>
                    <LayoutOptionsSwitch
                      usePrintLayout={usePrintLayout}
                      printLayoutChange={(evt) => setPrintLayout(evt.target.checked)}
                    />
                  </EuiFlexItem>
                )}
              </Fragment>
              <Fragment>
                {selectedMenuItem?.config.renderCopyURIButton && publicAPIEnabled && (
                  <EuiFlexItem>
                    <EuiFormRow
                      label={
                        <EuiText size="s">
                          <h4>
                            <FormattedMessage
                              id="share.export.postURLHeading"
                              defaultMessage="Post URL"
                            />
                          </h4>
                        </EuiText>
                      }
                      fullWidth
                    >
                      <EuiFlexGroup direction="column">
                        <EuiFlexItem>
                          <EuiText size="s" color="subdued">
                            <FormattedMessage
                              id="share.export.postURLDescription"
                              defaultMessage="Allows to generate selected file format programmatically outside Kibana or in Watcher."
                            />
                          </EuiText>
                        </EuiFlexItem>
                        <EuiFlexItem>
                          <EuiCodeBlock
                            data-test-subj="exportAssetValue"
                            css={{ overflowWrap: 'break-word' }}
                            language="text"
                            isCopyable
                            copyAriaLabel={i18n.translate('share.export.copyPostURLAriaLabel', {
                              defaultMessage: 'Copy export asset value',
                            })}
                          >
                            {selectedMenuItem?.config.generateAssetURIValue({
                              intl,
                              optimizedForPrinting: usePrintLayout,
                            })}
                          </EuiCodeBlock>
                        </EuiFlexItem>
                      </EuiFlexGroup>
                    </EuiFormRow>
                  </EuiFlexItem>
                )}
              </Fragment>
              <Fragment>
                {publicAPIEnabled && isDirty && (
                  <EuiFlexItem>
                    <EuiCallOut
                      color="warning"
                      iconType="warning"
                      title={
                        <FormattedMessage
                          id="share.link.warning.title"
                          defaultMessage="Unsaved changes"
                        />
                      }
                    >
                      <FormattedMessage
                        id="share.postURLWatcherMessage.unsavedChanges"
                        defaultMessage="URL may change if you upgrade Kibana."
                      />
                    </EuiCallOut>
                  </EuiFlexItem>
                )}
              </Fragment>
            </EuiFlexGroup>
          </EuiFlyoutBody>
          <EuiFlyoutFooter>
            <EuiFlexGroup justifyContent="spaceBetween">
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty
                  data-test-subj="exportFlyoutCloseButton"
                  onClick={flyoutOnCloseHandler}
                >
                  <FormattedMessage
                    id="share.export.closeFlyoutButtonLabel"
                    defaultMessage="Close"
                  />
                </EuiButtonEmpty>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButton
                  fill
                  onClick={getReport}
                  data-test-subj="generateReportButton"
                  isLoading={isCreatingExport}
                >
                  {selectedMenuItem?.config.generateExportButton ?? (
                    <FormattedMessage
                      id="share.export.generateButtonLabel"
                      defaultMessage="Export {type}"
                      values={{ type: selectedMenuItem?.config.label }}
                    />
                  )}
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlyoutFooter>
        </EuiFlyout>
      )}
    </Fragment>
  );
}
