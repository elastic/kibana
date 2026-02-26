/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { type KeyboardEvent, type PropsWithChildren, useCallback } from 'react';
import { css } from '@emotion/react';

import { EuiPopover } from '@elastic/eui';

import { FOCUSABLE_SELECTOR } from './constants';
import { useDateRangePickerContext } from './date_range_picker_context';
import { DateRangePickerControl } from './date_range_picker_control';

/**
 * Dialog popover for the DateRangePicker.
 * Opens when the control enters editing mode.
 */
export function DateRangePickerDialog({ children }: PropsWithChildren) {
  const { isEditing, setIsEditing, maxWidth, panelRef, panelId } = useDateRangePickerContext();

  const closePopover = useCallback(() => {
    setIsEditing(false);
  }, [setIsEditing]);

  /**
   * Handle keyboard navigation inside the dialog panel.
   *
   * Manual focus trap, used instead of `EuiFocusTrap` because the trap
   * must not activate when the dialog opens (focus stays in the input).
   * It only applies once the user explicitly moves focus into the panel
   * via ArrowDown. `EuiFocusTrap` would require extra state to toggle
   * between "open but not trapping" and "open and trapping".
   */
  const onPanelKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        setIsEditing(false);
        return;
      }

      if (event.key === 'Tab') {
        const panel = panelRef.current;
        if (!panel) return;

        const tabbables = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
        if (tabbables.length === 0) return;

        const first = tabbables[0];
        const last = tabbables[tabbables.length - 1];

        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    },
    [panelRef, setIsEditing]
  );

  return (
    <EuiPopover
      css={css({ maxInlineSize: maxWidth })}
      button={<DateRangePickerControl />}
      isOpen={isEditing}
      closePopover={closePopover}
      anchorPosition="downLeft"
      attachToAnchor={true}
      repositionToCrossAxis={false}
      display="block"
      ownFocus={false}
      panelPaddingSize="none"
    >
      {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions */}
      <div
        css={css({ minWidth: maxWidth })}
        ref={panelRef}
        id={panelId}
        role="dialog"
        aria-label="Date range picker dialog"
        tabIndex={-1}
        onKeyDown={onPanelKeyDown}
      >
        {children}
      </div>
    </EuiPopover>
  );
}
