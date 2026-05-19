/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { type KeyboardEvent, type PropsWithChildren, useCallback, useRef } from 'react';
import { css } from '@emotion/react';

import { EuiPopover, keys, useEuiTheme } from '@elastic/eui';

import { CALENDAR_SCROLLER_SELECTOR, FOCUSABLE_SELECTOR } from './constants';
import { useDateRangePickerContext } from './date_range_picker_context';
import { DateRangePickerControl } from './date_range_picker_control';
import { dialogTexts } from './translations';

/**
 * Dialog popover for the DateRangePicker.
 * Opens when the control enters editing mode.
 */
export function DateRangePickerDialog({ children }: PropsWithChildren) {
  const { isEditing, setIsEditing, panelRef, panelId, width } = useDateRangePickerContext();
  const { euiTheme } = useEuiTheme();
  const maxWidth = euiTheme.components.forms.maxWidth;

  // Remembers the last day button that had focus before Tab exited the calendar,
  // so Tab re-entry lands on the same day rather than the first react-day-picker instance.
  const lastFocusedCalendarDayRef = useRef<HTMLElement | null>(null);

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
      if (event.key === keys.ESCAPE) {
        event.preventDefault();
        event.stopPropagation();
        setIsEditing(false);
        return;
      }

      if (event.key === keys.TAB) {
        const panel = panelRef.current;
        if (!panel) return;

        const tabbables = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
        if (tabbables.length === 0) return;

        const first = tabbables[0];
        const last = tabbables[tabbables.length - 1];

        // The calendar scroller is a composite widget: arrow keys navigate dates,
        // Tab should exit/enter it cleanly rather than stepping through each
        // month's day buttons (which would be endless with infinite scroll).
        const calendarScroller = panel.querySelector<HTMLElement>(CALENDAR_SCROLLER_SELECTOR);

        if (calendarScroller) {
          const calendarTabbables = Array.from(
            calendarScroller.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
          );

          if (calendarTabbables.length > 0) {
            const firstCalIdx = tabbables.indexOf(calendarTabbables[0]);
            const lastCalIdx = tabbables.indexOf(calendarTabbables[calendarTabbables.length - 1]);

            if (firstCalIdx < 0 || lastCalIdx < 0) return;

            // Tab OUT: save the focused day so re-entry can restore it, then jump
            // to the element before/after the calendar.
            if (calendarScroller.contains(document.activeElement)) {
              if (document.activeElement instanceof HTMLElement) {
                lastFocusedCalendarDayRef.current = document.activeElement;
              }

              const target = event.shiftKey
                ? tabbables[firstCalIdx - 1]
                : tabbables[lastCalIdx + 1];

              if (target) {
                event.preventDefault();
                target.focus();
                return;
              }
            }

            // Tab INTO calendar: restore the saved day so the user lands where
            // they left off. Falls back to the first `tabIndex={0}` day in the scroller
            // (react-day-picker's focused day) if the calendar hasn't been visited yet.
            const justBefore = firstCalIdx > 0 ? tabbables[firstCalIdx - 1] : null;
            const justAfter = lastCalIdx < tabbables.length - 1 ? tabbables[lastCalIdx + 1] : null;

            if (
              (!event.shiftKey && document.activeElement === justBefore) ||
              (event.shiftKey && document.activeElement === justAfter)
            ) {
              const saved = lastFocusedCalendarDayRef.current;
              const target =
                (saved && document.body.contains(saved) ? saved : null) ??
                calendarScroller.querySelector<HTMLElement>('[tabindex="0"]');
              if (target) {
                event.preventDefault();
                target.focus();
                return;
              }
            }
          }
        }

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

  const popoverWrapperFullWidthStyles = css`
    inline-size: 100%;
  `;

  return (
    <EuiPopover
      aria-labelledby={panelId}
      css={width === 'full' && popoverWrapperFullWidthStyles}
      button={<DateRangePickerControl />}
      isOpen={isEditing}
      closePopover={closePopover}
      anchorPosition="downLeft"
      attachToAnchor={true}
      repositionToCrossAxis={false}
      display={width === 'auto' ? 'inline' : 'block'}
      ownFocus={false}
      data-test-subj="dateRangePickerPopoverTriggerWrapper"
      panelPaddingSize="none"
      panelRef={(node) => {
        panelRef.current = node;
      }}
      panelProps={{
        id: panelId,
        'aria-label': dialogTexts.ariaLabel,
        'data-test-subj': 'dateRangePickerPopoverPanel',
        'aria-modal': undefined,
        tabIndex: -1,
        onKeyDown: onPanelKeyDown,
        css: css({
          inlineSize: maxWidth,
          maxInlineSize: '100%',
        }),
      }}
    >
      {children}
    </EuiPopover>
  );
}
