/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiPopover, useEuiOverflowScroll } from '@elastic/eui';
import { css } from '@emotion/react';
import type { ReactNode, ReactElement } from 'react';
import React, { useRef, useMemo, useCallback, cloneElement, useEffect } from 'react';

import { focusFirstElement } from '../../utils/focus_first_element';
import { blurPopover } from './blur_popover';
import { usePopoverOpen } from './use_popover_open';
import { useKeyboardManagement } from './use_keyboard_management';
import { usePopoverHover } from './use_popover_hover';
import { usePersistentPopover } from './use_persistent_popover';
import {
  BOTTOM_POPOVER_GAP,
  POPOVER_OFFSET,
  TOP_BAR_HEIGHT,
  TOP_BAR_POPOVER_GAP,
} from '../../constants';

export interface SideNavPopoverProps {
  container: HTMLElement;
  children?: ReactNode | ((closePopover: () => void) => ReactNode);
  hasContent: boolean;
  isSidePanelOpen: boolean;
  label: string;
  trigger: ReactElement<{
    ref?: React.Ref<HTMLElement>;
    onClick?: (e: React.MouseEvent) => void;
    onKeyDown?: (e: React.KeyboardEvent) => void;
    tabIndex?: number;
    'aria-haspopup'?: boolean | 'menu' | 'listbox' | 'tree' | 'grid' | 'dialog';
    'aria-expanded'?: boolean;
  }>;
  persistent?: boolean;
}

export const SideNavPopover = ({
  children,
  container,
  hasContent,
  isSidePanelOpen,
  label,
  persistent = false,
  trigger,
}: SideNavPopoverProps): JSX.Element => {
  const popoverRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLElement>(null);

  const { isOpen, open, close } = usePopoverOpen();
  const { isPersistent, setPersistent, clearPersistent } = usePersistentPopover();

  const handleClose = useCallback(() => {
    close();
    clearPersistent();
  }, [close, clearPersistent]);

  const { handleMouseEnter, handleMouseLeave, clearTimeout } = usePopoverHover(
    persistent,
    isPersistent,
    isSidePanelOpen,
    { open, close: handleClose }
  );

  const handleTriggerClick = useCallback(() => {
    if (persistent) {
      if (isOpen && isPersistent) {
        handleClose();
      } else {
        clearTimeout();
        open();
        setPersistent();
      }
    }
  }, [persistent, isOpen, isPersistent, handleClose, clearTimeout, open, setPersistent]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        trigger.props.onKeyDown?.(e);
        if (hasContent && !e.defaultPrevented) {
          // Required for entering the popover with Enter or Space key
          // Otherwise the navigation happens immediately
          e.preventDefault();
          open();
          setTimeout(() => focusFirstElement(popoverRef), 0);
        }
      } else {
        trigger.props.onKeyDown?.(e);
      }
    },
    [trigger, hasContent, open]
  );

  useKeyboardManagement(isOpen, handleClose, triggerRef, popoverRef);

  useEffect(() => {
    return () => {
      clearTimeout();
      handleClose();
    };
  }, [clearTimeout, handleClose]);

  const enhancedTrigger = useMemo(
    () =>
      cloneElement(trigger, {
        ref: triggerRef,
        'aria-haspopup': hasContent,
        'aria-expanded': hasContent ? isOpen : undefined,
        onClick: (e: React.MouseEvent) => {
          trigger.props.onClick?.(e);
          handleTriggerClick();
        },
        onKeyDown: handleKeyDown,
      }),
    [trigger, hasContent, isOpen, handleKeyDown, handleTriggerClick]
  );

  return (
    <div
      css={css`
        width: 100%;
      `}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleMouseEnter}
      onBlur={blurPopover(triggerRef, popoverRef, handleClose)}
    >
      <EuiPopover
        aria-label={label}
        anchorPosition="rightUp"
        buffer={[TOP_BAR_HEIGHT + TOP_BAR_POPOVER_GAP, 0, BOTTOM_POPOVER_GAP, POPOVER_OFFSET]}
        button={enhancedTrigger}
        closePopover={handleClose}
        container={container}
        display="block"
        hasArrow={false}
        isOpen={hasContent && !isSidePanelOpen && isOpen}
        offset={POPOVER_OFFSET}
        ownFocus={false}
        panelPaddingSize="none"
        repositionOnScroll
      >
        <div
          ref={popoverRef}
          css={css`
            max-height: 600px;
            ${useEuiOverflowScroll('y')}
          `}
        >
          {typeof children === 'function' ? children(handleClose) : children}
        </div>
      </EuiPopover>
    </div>
  );
};
