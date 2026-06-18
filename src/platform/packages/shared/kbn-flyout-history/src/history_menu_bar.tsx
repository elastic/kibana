/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState } from 'react';
import {
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiListGroup,
  EuiListGroupItem,
  EuiPopover,
  EuiToolTip,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { useHistoryItems } from './history_context';
import { useGoBack } from './hooks';

export const HistoryMenuBar = (): React.JSX.Element | null => {
  const historyItems = useHistoryItems();
  const goBack = useGoBack();
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  if (historyItems.length === 0) return null;

  const historyLabel = i18n.translate('kbnFlyoutHistory.menuBar.historyButtonLabel', {
    defaultMessage: 'History',
  });

  return (
    <EuiFlexGroup gutterSize="none" responsive={false}>
      <EuiFlexItem grow={false}>
        <EuiButtonEmpty
          size="xs"
          color="text"
          iconType="undo"
          onClick={goBack}
          data-test-subj="euiFlyoutMenuBackButton"
        >
          <FormattedMessage id="kbnFlyoutHistory.menuBar.back" defaultMessage="Back" />
        </EuiButtonEmpty>
      </EuiFlexItem>
      {historyItems.length > 1 && (
        <EuiFlexItem grow={false}>
          <EuiPopover
            aria-label={historyLabel}
            button={
              <EuiToolTip content={historyLabel} disableScreenReaderOutput>
                <EuiButtonIcon
                  iconType="chevronSingleDown"
                  color="text"
                  size="xs"
                  aria-label={historyLabel}
                  onClick={() => setIsPopoverOpen(!isPopoverOpen)}
                  data-test-subj="euiFlyoutMenuHistoryButton"
                />
              </EuiToolTip>
            }
            isOpen={isPopoverOpen}
            closePopover={() => setIsPopoverOpen(false)}
            panelPaddingSize="xs"
            anchorPosition="downLeft"
          >
            <EuiListGroup>
              {historyItems.map((item, index) => (
                <EuiListGroupItem
                  key={`history-item-${index}`}
                  label={item.title}
                  iconType={item.iconType}
                  onClick={() => {
                    item.onClick();
                    setIsPopoverOpen(false);
                  }}
                  data-test-subj={`euiFlyoutMenuHistoryItem-${index}`}
                />
              ))}
            </EuiListGroup>
          </EuiPopover>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};
