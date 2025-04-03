/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { type FC, useState, Fragment, useMemo, useCallback } from 'react';
import {
  EuiWrappingPopover,
  EuiListGroup,
  EuiListGroupItem,
  EuiFlyout,
  EuiFlyoutHeader,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiTitle,
  EuiButton,
  EuiButtonEmpty,
  EuiCodeBlock,
  EuiFlexGroup,
  EuiFlexItem,
  EuiToolTip,
} from '@elastic/eui';
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

function ExportMenuPopover({ intl }: ExportMenuProps) {
  const { onClose, anchorElement, shareMenuItems } = useShareTabsContext('integration', 'export');
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
                key={menuItem.id}
                label={menuItem.config.label}
                onClick={() => {
                  setSelectedMenuItemId(menuItem.id);
                  setIsFlyoutVisible(true);
                  // onClose();
                }}
              />
            </EuiToolTip>
          ))}
        </EuiListGroup>
      </EuiWrappingPopover>
      {isFlyoutVisible && (
        <EuiFlyout size="s" onClose={() => setIsFlyoutVisible(false)} ownFocus>
          <EuiFlyoutHeader hasBorder>
            <EuiTitle>
              <h2>{selectedMenuItem?.config.label}</h2>
            </EuiTitle>
          </EuiFlyoutHeader>
          <EuiFlyoutBody>
            <EuiCodeBlock language="json">
              {JSON.stringify(selectedMenuItem?.config, null, 2)}
            </EuiCodeBlock>
          </EuiFlyoutBody>
          <EuiFlyoutFooter>
            <EuiFlexGroup justifyContent="spaceBetween">
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty onClick={() => setIsFlyoutVisible(false)}>Close</EuiButtonEmpty>
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
