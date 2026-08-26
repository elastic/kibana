/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useCallback, useRef, useState } from 'react';
import moment, { type Moment } from 'moment';
import type { monaco } from '@kbn/code-editor';

const DATEPICKER_WIDTH = 373;

interface UseTimePickerPopoverParams {
  editorRef: React.MutableRefObject<monaco.editor.IStandaloneCodeEditor | undefined>;
  popoverRef: React.MutableRefObject<HTMLDivElement | null>;
}

export const useTimePickerPopover = ({ editorRef, popoverRef }: UseTimePickerPopoverParams) => {
  const datePickerOpenStatusRef = useRef<boolean>(false);
  const [popoverPosition, setPopoverPosition] = useState<{ top?: number; left?: number }>({});
  const [timePickerDate, setTimePickerDate] = useState<Moment>(moment());

  const openTimePickerPopover = useCallback(() => {
    const currentCursorPosition = editorRef.current?.getPosition();
    const editorCoords = editorRef.current?.getDomNode()?.getBoundingClientRect();
    if (currentCursorPosition && editorCoords) {
      const editorPosition = editorRef.current!.getScrolledVisiblePosition(currentCursorPosition);
      const editorTop = editorCoords.top;
      const editorLeft = editorCoords.left;

      // Calculate the absolute position of the popover
      const absoluteTop = editorTop + (editorPosition?.top ?? 0) + 25;
      let absoluteLeft = editorLeft + (editorPosition?.left ?? 0);
      if (absoluteLeft + DATEPICKER_WIDTH > editorCoords.right) {
        // date picker is out of the editor
        absoluteLeft = absoluteLeft - DATEPICKER_WIDTH;
      }

      // Set time picker date to the nearest half hour
      setTimePickerDate(
        moment()
          .minute(Math.round(moment().minute() / 30) * 30)
          .second(0)
          .millisecond(0)
      );

      setPopoverPosition({ top: absoluteTop, left: absoluteLeft });
      datePickerOpenStatusRef.current = true;
      // Focus the popover container after React renders the portal.
      // A synchronous focus() here would be a no-op since setPopoverPosition
      // hasn't triggered a re-render yet and the div doesn't exist in the DOM.
      requestAnimationFrame(() => {
        popoverRef.current?.focus();
      });
    }
  }, [editorRef, popoverRef]);

  return {
    openTimePickerPopover,
    popoverPosition,
    setPopoverPosition,
    timePickerDate,
    setTimePickerDate,
    datePickerOpenStatusRef,
  };
};
