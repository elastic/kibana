/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { css } from '@emotion/react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiPopover,
  EuiPopoverProps,
  EuiPopoverTitle,
  type UseEuiTheme,
} from '@elastic/eui';

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
      panelProps={{
        css: styles.fieldPopoverPanel,
      }}
      {...otherPopoverProps}
    >
      {isOpen && (
        <EuiFlexGroup gutterSize="none" direction="column" css={styles.popoverContentContainer}>
          {Boolean(header) && (
            <EuiFlexItem grow={false}>
              {content ? <EuiPopoverTitle>{header}</EuiPopoverTitle> : header}
            </EuiFlexItem>
          )}
          {content ? (
            <EuiFlexItem className="eui-yScrollWithShadows" css={styles.popoverContent}>
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

// popover styles can't be memoized with `useMemoCss` because they are used conditionally (rules of hooks)
/* `important` is to ensure that even if styles ordering is different (like for some reason on Developer Examples page),
  this one will be used instead of eui defaults */
const styles = {
  fieldPopoverPanel: ({ euiTheme }: UseEuiTheme) =>
    css({
      minWidth: `calc(${euiTheme.size.xxl} * 6.5) !important`,
      maxWidth: `calc(${euiTheme.size.xxl} * 10) !important`,

      '.unifiedFieldListItemButton': {
        boxShadow: 'none',
        background: 'none',
      },
    }),
  popoverContentContainer: css({ maxHeight: '90vh' }),
  popoverContent: ({ euiTheme }: UseEuiTheme) =>
    css({
      padding: euiTheme.size.base,
      margin: `-${euiTheme.size.base}`,
    }),
};
