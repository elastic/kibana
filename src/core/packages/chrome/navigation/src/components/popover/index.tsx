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
import type { ReactNode, ReactElement, FocusEventHandler, KeyboardEventHandler } from 'react';
import React, { useRef, useMemo, useCallback, cloneElement, useEffect } from 'react';
import { useEuiTheme } from '@elastic/eui';

import { focusFirstElement } from '../../utils/focus_first_element';
import { useRovingIndex } from '../../hooks/use_roving_index';
import { useIsElementReady } from '../../hooks/use_is_element_ready';
import { usePopoverOpen } from './use_popover_open';
import { usePopoverHover } from './use_popover_hover';
import { usePersistentPopover } from './use_persistent_popover';
import {
  BOTTOM_POPOVER_GAP,
  POPOVER_OFFSET,
  TOP_BAR_HEIGHT,
  TOP_BAR_POPOVER_GAP,
} from '../../constants';

export interface SideNavPopoverProps {
  container?: HTMLElement;
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
  const { euiTheme } = useEuiTheme();

  const popoverRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLElement>(null);

  const { isOpen, open, close } = usePopoverOpen();
  const { isPersistent, setPersistent, clearPersistent } = usePersistentPopover();
  const isPopoverReady = useIsElementReady(isOpen, popoverRef);

  useRovingIndex(popoverRef, isPopoverReady);

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

  const handleTriggerKeyDown: KeyboardEventHandler = useCallback(
    (e) => {
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

  const handlePopoverKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
        triggerRef.current?.focus();
      }
    },
    [handleClose, triggerRef]
  );

  const handleBlur: FocusEventHandler = (e) => {
    clearTimeout();

    const nextFocused = e.relatedTarget as Node;
    const isStayingInComponent =
      nextFocused &&
      (triggerRef.current?.contains(nextFocused) || popoverRef.current?.contains(nextFocused));

    if (!isStayingInComponent) {
      handleClose();
    }
  };

  useEffect(() => {
    return () => {
      clearTimeout();
      handleClose();
    };
  }, [clearTimeout, handleClose]);

  useEffect(() => {
    const popover = popoverRef.current;

    if (popover && isOpen) {
      popover.addEventListener('keydown', handlePopoverKeyDown, true);

      return () => popover.removeEventListener('keydown', handlePopoverKeyDown, true);
    }
  }, [isOpen, handleClose, triggerRef, handlePopoverKeyDown]);

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
        onKeyDown: handleTriggerKeyDown,
      }),
    [trigger, hasContent, isOpen, handleTriggerKeyDown, handleTriggerClick]
  );

  const wrapperStyles = css`
    width: 100%;
  `;

  const popoverContentStyles = css`
    --popover-max-height: 37.5rem;

    max-height: var(--popover-max-height);
    ${useEuiOverflowScroll('y', true)}
  `;

  const maskStyles = css`
    position: fixed;
    inset: 0;
    z-index: calc(${euiTheme.levels.menu} - 1);
  `;

  return (
    <div
      css={wrapperStyles}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleMouseEnter}
      onBlur={handleBlur}
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
        <div ref={popoverRef} css={popoverContentStyles}>
          {typeof children === 'function' ? children(handleClose) : children}
        </div>
      </EuiPopover>
      {persistent && isPersistent && isOpen && (
        // eslint-disable-next-line jsx-a11y/click-events-have-key-events
        <div onClick={handleClose} css={maskStyles} />
      )}
    </div>
  );
};
