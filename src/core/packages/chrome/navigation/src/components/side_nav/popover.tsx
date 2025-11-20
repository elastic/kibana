/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useRef, useMemo, useCallback, cloneElement, useEffect, useState } from 'react';
import type {
  ReactNode,
  ReactElement,
  FocusEventHandler,
  KeyboardEventHandler,
  MouseEvent,
  KeyboardEvent,
  Ref,
} from 'react';
import { EuiPopover, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';

import {
  BOTTOM_POPOVER_GAP,
  POPOVER_HOVER_DELAY,
  POPOVER_OFFSET,
  TOP_BAR_HEIGHT,
  TOP_BAR_POPOVER_GAP,
} from '../../constants';
import { SIDE_PANEL_WIDTH } from '../../hooks/use_layout_width';
import { focusAdjacentTrigger } from '../../utils/focus_adjacent_trigger';
import { focusFirstElement } from '../../utils/focus_first_element';
import { getFocusableElements } from '../../utils/get_focusable_elements';
import { handleRovingIndex } from '../../utils/handle_roving_index';
import { updateTabIndices } from '../../utils/update_tab_indices';
import { useHoverTimeout } from '../../hooks/use_hover_timeout';
import { useScroll } from '../../hooks/use_scroll';

export interface PopoverProps {
  children?: ReactNode | ((closePopover: () => void) => ReactNode);
  container?: HTMLElement;
  hasContent: boolean;
  isAnyPopoverOpen: boolean;
  isSidePanelOpen: boolean;
  label: string;
  persistent?: boolean;
  setAnyPopoverOpen: (isOpen: boolean) => void;
  trigger: ReactElement<{
    ref?: Ref<HTMLElement>;
    onClick?: (e: MouseEvent) => void;
    onKeyDown?: (e: KeyboardEvent) => void;
    tabIndex?: number;
    'aria-haspopup'?: boolean | 'menu' | 'listbox' | 'tree' | 'grid' | 'dialog';
    'aria-expanded'?: boolean;
  }>;
}

/**
 * The side nav popover differs from the regular `EuiPopover`:
 * - it opens on focus and hover, instead of just click,
 * - it handles keyboard navigation
 *   - Enter to move focus into the popover
 *   - Arrow keys to move focus between elements,
 *   - Escape to move focus back to the trigger.
 */
export const Popover = ({
  children,
  container,
  hasContent,
  isAnyPopoverOpen,
  isSidePanelOpen,
  label,
  persistent = false,
  setAnyPopoverOpen,
  trigger,
}: PopoverProps): JSX.Element => {
  const { euiTheme } = useEuiTheme();
  const { setHoverTimeout, clearHoverTimeout } = useHoverTimeout();

  const popoverRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLElement>(null);

  const [isOpenedByClick, setIsOpenedByClick] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [shouldFocusOnOpen, setShouldFocusOnOpen] = useState(false);

  const setOpenedByClick = useCallback(() => setIsOpenedByClick(true), []);

  const clearOpenedByClick = useCallback(() => setIsOpenedByClick(false), []);

  const open = useCallback(() => {
    setIsOpen(true);
    setAnyPopoverOpen(true);
  }, [setAnyPopoverOpen]);

  const close = useCallback(() => {
    setIsOpen(false);
    clearOpenedByClick();
    clearHoverTimeout();
    setShouldFocusOnOpen(false);
    setAnyPopoverOpen(false);
  }, [clearOpenedByClick, clearHoverTimeout, setAnyPopoverOpen]);

  const handleClose = useCallback(() => {
    clearHoverTimeout();
    close();
  }, [clearHoverTimeout, close]);

  const tryOpen = useCallback(() => {
    if (!isSidePanelOpen && !isAnyPopoverOpen) {
      open();
    }
  }, [isAnyPopoverOpen, isSidePanelOpen, open]);

  const handleMouseEnter = useCallback(() => {
    if (!persistent || !isOpenedByClick) {
      clearHoverTimeout();
      if (isAnyPopoverOpen) {
        setHoverTimeout(tryOpen, POPOVER_HOVER_DELAY);
      } else if (!isSidePanelOpen) {
        setHoverTimeout(open, POPOVER_HOVER_DELAY);
      }
    }
  }, [
    persistent,
    isOpenedByClick,
    isAnyPopoverOpen,
    isSidePanelOpen,
    clearHoverTimeout,
    open,
    setHoverTimeout,
    tryOpen,
  ]);

  const handleMouseLeave = useCallback(() => {
    if (!persistent || !isOpenedByClick) {
      setHoverTimeout(handleClose, POPOVER_HOVER_DELAY);
    }
  }, [persistent, isOpenedByClick, setHoverTimeout, handleClose]);

  const scrollStyles = useScroll(true);

  const handleTriggerClick = useCallback(() => {
    if (persistent) {
      if (isOpen && isOpenedByClick) {
        handleClose();
      } else {
        clearHoverTimeout();
        open();
        setOpenedByClick();
      }
    }
  }, [persistent, isOpen, isOpenedByClick, handleClose, clearHoverTimeout, open, setOpenedByClick]);

  const handleTriggerKeyDown: KeyboardEventHandler = useCallback(
    (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        trigger.props.onKeyDown?.(e);

        if (hasContent) {
          // Required for entering the popover with Enter or Space key
          // Otherwise the navigation happens immediately
          e.preventDefault();
          setShouldFocusOnOpen(true);
          open();
        }
      } else {
        trigger.props.onKeyDown?.(e);
      }
    },
    [trigger, hasContent, open]
  );

  const handlePopoverKeyDown: KeyboardEventHandler<HTMLDivElement> = useCallback(
    (e) => {
      if (e.key === 'Escape') {
        handleClose();
        triggerRef.current?.focus();
        return;
      }

      if (e.key === 'Tab') {
        e.preventDefault();
        handleClose();
        focusAdjacentTrigger(triggerRef, e.shiftKey ? -1 : 1);
        return;
      }

      handleRovingIndex(e);
    },
    [handleClose]
  );

  const handleBlur: FocusEventHandler = useCallback(
    (e) => {
      clearHoverTimeout();

      const nextFocused = e.relatedTarget;
      const isStayingInComponent =
        nextFocused &&
        Boolean(
          triggerRef.current?.contains(nextFocused) || popoverRef.current?.contains(nextFocused)
        );
      const isTrappedByFlyout = (nextFocused as HTMLElement)?.classList.contains('euiFlyout');

      if (isStayingInComponent === false && isTrappedByFlyout === false) {
        handleClose();
      }
    },
    [clearHoverTimeout, handleClose]
  );

  // Clean up on unmount
  useEffect(() => {
    return () => {
      clearHoverTimeout();
      handleClose();
    };
  }, [clearHoverTimeout, handleClose]);

  const enhancedTrigger = useMemo(
    () =>
      cloneElement(trigger, {
        ref: triggerRef,
        'aria-haspopup': hasContent,
        'aria-expanded': hasContent ? isOpen : undefined,
        onClick: (e: MouseEvent) => {
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
    width: ${SIDE_PANEL_WIDTH}px;
    max-height: var(--popover-max-height);
    ${scrollStyles};
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
        <div
          ref={(ref) => {
            popoverRef.current = ref;

            if (ref) {
              const elements = getFocusableElements(ref);
              updateTabIndices(elements);

              if (shouldFocusOnOpen) {
                focusFirstElement(popoverRef);
                setShouldFocusOnOpen(false);
              }
            }
          }}
          onKeyDown={handlePopoverKeyDown}
          css={popoverContentStyles}
        >
          {typeof children === 'function' ? children(handleClose) : children}
        </div>
      </EuiPopover>
      {persistent && isOpenedByClick && isOpen && (
        // The persistent popover does not affect keyboard navigation users
        // eslint-disable-next-line jsx-a11y/click-events-have-key-events
        <div onClick={handleClose} css={maskStyles} />
      )}
    </div>
  );
};
