/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiPopover,
  EuiPopoverProps,
  EuiPopoverTitle,
} from '@elastic/eui';
import './field_popover.scss';
import { euiThemeVars } from '@kbn/ui-theme';

export interface FieldPopoverProps extends EuiPopoverProps {
  renderHeader?: () => React.ReactNode;
  renderContent?: () => React.ReactNode;
  renderFooter?: () => React.ReactNode;
}

export const FieldPopover: React.FC<FieldPopoverProps> = ({
  isOpen,
  closePopover,
  renderHeader,
  renderContent,
  renderFooter,
  ...otherPopoverProps
}) => {
  let header: React.ReactNode | null = null;
  let content: React.ReactNode | null = null;
  let footer: React.ReactNode | null = null;

  if (isOpen) {
    try {
      header = renderHeader?.() || null;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(error);
    }

    try {
      content = renderContent?.() || null;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(error);
    }

    try {
      footer = renderFooter?.() || null;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(error);
    }
  }

  return (
    <EuiPopover
      ownFocus
      isOpen={isOpen}
      closePopover={closePopover}
      display="block"
      anchorPosition="rightUp"
      data-test-subj="fieldPopover"
      panelClassName="unifiedFieldList__fieldPopover__fieldPopoverPanel"
      {...otherPopoverProps}
    >
      {isOpen && (
        <EuiFlexGroup gutterSize="none" direction="column" css={{ maxHeight: '90vh' }}>
          {Boolean(header) && (
            <EuiFlexItem grow={false}>
              {content ? <EuiPopoverTitle>{header}</EuiPopoverTitle> : header}
            </EuiFlexItem>
          )}
          {content ? (
            <EuiFlexItem
              className="eui-yScrollWithShadows"
              css={{
                padding: euiThemeVars.euiSize,
                margin: `-${euiThemeVars.euiSize}`,
              }}
            >
              {content}
            </EuiFlexItem>
          ) : (
            content
          )}
          {Boolean(footer) && <EuiFlexItem grow={false}>{footer}</EuiFlexItem>}
        </EuiFlexGroup>
      )}
    </EuiPopover>
  );
};
