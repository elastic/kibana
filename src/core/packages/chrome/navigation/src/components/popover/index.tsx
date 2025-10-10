/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiPopover } from '@elastic/eui';
import { css } from '@emotion/react';
import type {
  ReactNode,
  ReactElement,
  FocusEventHandler,
  KeyboardEventHandler,
  MouseEvent,
  KeyboardEvent,
  Ref,
} from 'react';
import React, { useRef, useMemo, useCallback, cloneElement, useEffect, useState } from 'react';
import { useEuiTheme } from '@elastic/eui';

import { SIDE_PANEL_WIDTH } from '../../hooks/use_layout_width';
import { focusAdjacentTrigger } from '../../utils/focus_adjacent_trigger';
import { focusFirstElement } from '../../utils/focus_first_element';
import { getFocusableElements } from '../../utils/get_focusable_elements';
import { handleRovingIndex } from '../../utils/handle_roving_index';
import { updateTabIndices } from '../../utils/update_tab_indices';
import { useHoverTimeout } from '../../hooks/use_hover_timeout';
import { useScroll } from '../../hooks/use_scroll';
import {
  BOTTOM_POPOVER_GAP,
  POPOVER_HOVER_DELAY,
  POPOVER_OFFSET,
  TOP_BAR_HEIGHT,
  TOP_BAR_POPOVER_GAP,
} from '../../constants';

/**
 * Flag for tracking if any popover is open.
 */
let anyPopoverOpen: boolean = false;

/**
 * Utility function to check if any popover is open.
 *
 * @returns true if any popover is open
 */
export const getIsAnyPopoverOpenNow = () => anyPopoverOpen;

export interface SideNavPopoverProps {
  container?: HTMLElement;
  children?: ReactNode | ((closePopover: () => void) => ReactNode);
  hasContent: boolean;
  isSidePanelOpen: boolean;
  label: string;
  trigger: ReactElement<{
    ref?: Ref<HTMLElement>;
    onClick?: (e: MouseEvent) => void;
    onKeyDown?: (e: KeyboardEvent) => void;
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
  const { setTimeout, clearTimeout } = useHoverTimeout();

  const popoverRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLElement>(null);

  const [isOpenedByClick, setIsOpenedByClick] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [shouldFocusOnOpen, setShouldFocusOnOpen] = useState(false);
  const [wasKeyboardUsed, setWasKeyboardUsed] = useState(false);

  const setOpenedByClick = useCallback(() => {
    console.log(`*** [Popover:${label}] setOpenedByClick()`);
    setIsOpenedByClick(true);
  }, [label]);

  const clearOpenedByClick = useCallback(() => {
    console.log(`*** [Popover:${label}] clearOpenedByClick()`);
    setIsOpenedByClick(false);
  }, [label]);

  const open = useCallback(() => {
    console.log(`*** [Popover:${label}] open() - setting isOpen=true, anyPopoverOpen=true`);
    console.log(
      `*** [Popover:${label}] open() - isSidePanelOpen=${isSidePanelOpen}, previous anyPopoverOpen=${anyPopoverOpen}`
    );
    setIsOpen(true);
    anyPopoverOpen = true;
  }, [label, isSidePanelOpen]);

  const close = useCallback(() => {
    console.log(`*** [Popover:${label}] close() - setting isOpen=false, anyPopoverOpen=false`);
    console.log(`*** [Popover:${label}] close() - previous anyPopoverOpen=${anyPopoverOpen}`);
    setIsOpen(false);
    clearOpenedByClick();
    clearTimeout();
    setShouldFocusOnOpen(false);
    anyPopoverOpen = false;
  }, [clearOpenedByClick, clearTimeout, label]);

  const handleClose = useCallback(() => {
    console.log(`*** [Popover:${label}] handleClose()`);
    clearTimeout();
    close();
  }, [clearTimeout, close, label]);

  const tryOpen = useCallback(() => {
    console.log(
      `*** [Popover:${label}] tryOpen() - isSidePanelOpen=${isSidePanelOpen}, anyPopoverOpen=${getIsAnyPopoverOpenNow()}`
    );
    if (!isSidePanelOpen && !getIsAnyPopoverOpenNow()) {
      console.log(`*** [Popover:${label}] tryOpen() - conditions met, calling open()`);
      open();
    } else {
      console.log(`*** [Popover:${label}] tryOpen() - conditions NOT met, skipping open`);
    }
  }, [isSidePanelOpen, open, label]);

  const handleMouseEnter = useCallback(() => {
    console.log(
      `*** [Popover:${label}] handleMouseEnter() - persistent=${persistent}, isOpenedByClick=${isOpenedByClick}`
    );
    if (!persistent || !isOpenedByClick) {
      clearTimeout();
      if (getIsAnyPopoverOpenNow()) {
        console.log(
          `*** [Popover:${label}] handleMouseEnter() - another popover open, scheduling tryOpen`
        );
        setTimeout(tryOpen, POPOVER_HOVER_DELAY);
      } else if (!isSidePanelOpen) {
        console.log(`*** [Popover:${label}] handleMouseEnter() - no popover open, scheduling open`);
        setTimeout(open, POPOVER_HOVER_DELAY);
      } else {
        console.log(`*** [Popover:${label}] handleMouseEnter() - side panel open, not opening`);
      }
    } else {
      console.log(
        `*** [Popover:${label}] handleMouseEnter() - persistent and opened by click, ignoring`
      );
    }
  }, [
    persistent,
    isOpenedByClick,
    isSidePanelOpen,
    clearTimeout,
    open,
    setTimeout,
    tryOpen,
    label,
  ]);

  const handleMouseLeave = useCallback(() => {
    console.log(
      `*** [Popover:${label}] handleMouseLeave() - persistent=${persistent}, isOpenedByClick=${isOpenedByClick}`
    );
    if (!persistent || !isOpenedByClick) {
      console.log(`*** [Popover:${label}] handleMouseLeave() - scheduling close`);
      setTimeout(handleClose, POPOVER_HOVER_DELAY);
    } else {
      console.log(
        `*** [Popover:${label}] handleMouseLeave() - persistent and opened by click, not closing`
      );
    }
  }, [persistent, isOpenedByClick, setTimeout, handleClose, label]);

  const scrollStyles = useScroll(true);

  const handleTriggerClick = useCallback(() => {
    console.log(
      `*** [Popover:${label}] handleTriggerClick() - persistent=${persistent}, isOpen=${isOpen}, isOpenedByClick=${isOpenedByClick}`
    );
    if (persistent) {
      if (isOpen && isOpenedByClick) {
        console.log(`*** [Popover:${label}] handleTriggerClick() - closing persistent popover`);
        handleClose();
      } else {
        console.log(`*** [Popover:${label}] handleTriggerClick() - opening persistent popover`);
        clearTimeout();
        open();
        setOpenedByClick();
      }
    } else {
      console.log(`*** [Popover:${label}] handleTriggerClick() - not persistent, ignoring click`);
    }
  }, [
    persistent,
    isOpen,
    isOpenedByClick,
    handleClose,
    clearTimeout,
    open,
    setOpenedByClick,
    label,
  ]);

  const handleTriggerKeyDown: KeyboardEventHandler = useCallback(
    (e) => {
      console.log(
        `*** [Popover:${label}] handleTriggerKeyDown() - key=${e.key}, hasContent=${hasContent}`
      );
      if (e.key === 'Enter' || e.key === ' ') {
        trigger.props.onKeyDown?.(e);

        if (hasContent) {
          // Required for entering the popover with Enter or Space key
          // Otherwise the navigation happens immediately
          console.log(
            `*** [Popover:${label}] handleTriggerKeyDown() - opening with keyboard, will focus`
          );
          e.preventDefault();
          setShouldFocusOnOpen(true);
          open();
        }
      } else {
        trigger.props.onKeyDown?.(e);
      }
    },
    [trigger, hasContent, open, label]
  );

  const handlePopoverKeyDown: KeyboardEventHandler<HTMLDivElement> = useCallback(
    (e) => {
      console.log(`*** [Popover:${label}] handlePopoverKeyDown() - key=${e.key}`);
      if (e.key === 'Escape') {
        console.log(`*** [Popover:${label}] handlePopoverKeyDown() - Escape pressed, closing`);
        handleClose();
        triggerRef.current?.focus();
        return;
      }

      if (e.key === 'Tab') {
        console.log(`*** [Popover:${label}] handlePopoverKeyDown() - Tab pressed, closing`);
        e.preventDefault();
        handleClose();
        focusAdjacentTrigger(triggerRef, e.shiftKey ? -1 : 1);
        return;
      }

      handleRovingIndex(e);
    },
    [handleClose, label]
  );

  const handleBlur: FocusEventHandler = useCallback(
    (e) => {
      console.log(`*** [Popover:${label}] handleBlur() - wasKeyboardUsed=${wasKeyboardUsed}`);
      if (!wasKeyboardUsed) {
        console.log(`*** [Popover:${label}] handleBlur() - keyboard not used, ignoring`);
        return;
      }

      clearTimeout();

      const nextFocused = e.relatedTarget;
      const isStayingInComponent =
        nextFocused &&
        (triggerRef.current?.contains(nextFocused) || popoverRef.current?.contains(nextFocused));

      console.log(
        `*** [Popover:${label}] handleBlur() - isStayingInComponent=${isStayingInComponent}`
      );
      if (!isStayingInComponent) {
        console.log(`*** [Popover:${label}] handleBlur() - leaving component, closing`);
        handleClose();
      }
    },
    [clearTimeout, handleClose, wasKeyboardUsed, label]
  );

  useEffect(() => {
    console.log(`*** [Popover:${label}] mounted`);
    return () => {
      console.log(`*** [Popover:${label}] unmounting - cleaning up`);
      clearTimeout();
      handleClose();
    };
  }, [clearTimeout, handleClose, label]);

  // TODO: refactor to use non-portalled popover
  // Track if the user has used the keyboard to interact with the popover.
  // `wasKeyboardUsed` is used to determine if the popover should be closed when the user blurs the popover.
  // If we blur it for mouse users as well, the popover isn't responsive when there are trap focus elements
  // on the page.
  useEffect(() => {
    const handleKeyDown = () => {
      console.log(`*** [Popover:${label}] keyboard used, setting wasKeyboardUsed=true`);
      setWasKeyboardUsed(true);
    };
    const handleMouseDown = () => {
      console.log(`*** [Popover:${label}] mouse used, setting wasKeyboardUsed=false`);
      setWasKeyboardUsed(false);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('mousedown', handleMouseDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('mousedown', handleMouseDown);
    };
  }, [label]);

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

  const euiPopoverIsOpen = hasContent && !isSidePanelOpen && isOpen;
  console.log(
    `*** [Popover:${label}] render - EuiPopover isOpen=${euiPopoverIsOpen} (hasContent=${hasContent}, isSidePanelOpen=${isSidePanelOpen}, isOpen=${isOpen})`
  );

  return (
    <div
      css={wrapperStyles}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleMouseEnter}
      onBlur={handleBlur}
    >
      <EuiPopover
        anchorPosition="rightUp"
        aria-label={label}
        buffer={[TOP_BAR_HEIGHT + TOP_BAR_POPOVER_GAP, 0, BOTTOM_POPOVER_GAP, POPOVER_OFFSET]}
        button={enhancedTrigger}
        closePopover={handleClose}
        container={container}
        display="block"
        hasArrow={false}
        isOpen={euiPopoverIsOpen}
        offset={POPOVER_OFFSET}
        ownFocus={false}
        panelPaddingSize="none"
        repositionOnScroll
      >
        <div
          ref={(node) => {
            popoverRef.current = node;

            if (node) {
              const elements = getFocusableElements(node);
              updateTabIndices(elements);

              if (shouldFocusOnOpen) {
                focusFirstElement(node);
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
