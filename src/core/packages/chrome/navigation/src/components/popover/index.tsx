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

  const setOpenedByClick = useCallback(() => setIsOpenedByClick(true), []);

  const clearOpenedByClick = useCallback(() => setIsOpenedByClick(false), []);

  const open = useCallback(() => {
    setIsOpen(true);
    anyPopoverOpen = true;
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    clearOpenedByClick();
    clearTimeout();
    setShouldFocusOnOpen(false);
    anyPopoverOpen = false;
  }, [clearOpenedByClick, clearTimeout]);

  const handleClose = useCallback(() => {
    clearTimeout();
    close();
  }, [clearTimeout, close]);

  const tryOpen = useCallback(() => {
    if (!isSidePanelOpen && !getIsAnyPopoverOpenNow()) {
      open();
    }
  }, [isSidePanelOpen, open]);

  const handleMouseEnter = useCallback(() => {
    if (!persistent || !isOpenedByClick) {
      clearTimeout();
      if (getIsAnyPopoverOpenNow()) {
        setTimeout(tryOpen, POPOVER_HOVER_DELAY);
      } else if (!isSidePanelOpen) {
        setTimeout(open, POPOVER_HOVER_DELAY);
      }
    }
  }, [persistent, isOpenedByClick, isSidePanelOpen, clearTimeout, open, setTimeout, tryOpen]);

  const handleMouseLeave = useCallback(() => {
    if (!persistent || !isOpenedByClick) {
      setTimeout(handleClose, POPOVER_HOVER_DELAY);
    }
  }, [persistent, isOpenedByClick, setTimeout, handleClose]);

  const scrollStyles = useScroll(true);

  const handleTriggerClick = useCallback(() => {
    if (persistent) {
      if (isOpen && isOpenedByClick) {
        handleClose();
      } else {
        clearTimeout();
        open();
        setOpenedByClick();
      }
    }
  }, [persistent, isOpen, isOpenedByClick, handleClose, clearTimeout, open, setOpenedByClick]);

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
      clearTimeout();

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
    [clearTimeout, handleClose]
  );

  // Clean up on unmount
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
