/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ReactNode } from 'react';
import React from 'react';
import { EuiPopover, EuiPortal } from '@elastic/eui';
import { css } from '@emotion/react';

const getAnchorStyles = ({ top, left, width, height }: DOMRect) =>
  css({ position: 'fixed', display: 'block', top, left, width, height, pointerEvents: 'none' });

export interface CellExpansionPopoverProps {
  /** Viewport rect of the element the popover opens below. */
  anchorRect: DOMRect;
  onClose: () => void;
  'aria-label': string;
  'data-test-subj'?: string;
  children: ReactNode;
}

/**
 * A focus-trapped popover anchored to the rect of the element that expanded a cell. The trigger can
 * unmount while the popover is open, e.g. when the cell actions collapse, so the popover is anchored
 * to a fixed rect in a portal instead of to the trigger.
 */
export const CellExpansionPopover = ({
  anchorRect,
  onClose,
  'aria-label': ariaLabel,
  'data-test-subj': dataTestSubj = 'euiDataGridExpansionPopover',
  children,
}: CellExpansionPopoverProps) => (
  <EuiPortal>
    <EuiPopover
      css={getAnchorStyles(anchorRect)}
      isOpen
      ownFocus
      closePopover={onClose}
      anchorPosition="downRight"
      aria-label={ariaLabel}
      panelPaddingSize="s"
      panelProps={{ 'data-test-subj': dataTestSubj }}
      button={<span aria-hidden="true" />}
    >
      {children}
    </EuiPopover>
  </EuiPortal>
);
