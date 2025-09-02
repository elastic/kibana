/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import moment from 'moment';
import React, { useState } from 'react';
import { monaco } from '@kbn/monaco';
import { EuiDatePicker } from '@elastic/eui';
import { PopoverWrapper } from './popover_wrapper';

export function DatePickerPopover({
  editorRef,
  editorModel,
  position,
  popoverRef,
  setPopoverPosition,
  datePickerOpenStatusRef,
}: {
  editorRef: React.MutableRefObject<monaco.editor.IStandaloneCodeEditor | undefined>;
  editorModel: React.MutableRefObject<monaco.editor.ITextModel | undefined>;
  position: Record<string, number>;
  popoverRef: React.RefObject<HTMLDivElement>;
  setPopoverPosition: (position: Record<string, number>) => void;
  datePickerOpenStatusRef: React.MutableRefObject<boolean>;
}) {
  const [timePickerDate, setTimePickerDate] = useState(moment());
  return (
    <PopoverWrapper
      position={position}
      popoverRef={popoverRef}
      dataTestSubj="ESQLEditor-timepicker-popover"
    >
      <EuiDatePicker
        selected={timePickerDate}
        autoFocus
        onChange={(date) => {
          if (date) {
            setTimePickerDate(date);
          }
        }}
        onSelect={(date, event) => {
          if (date && event) {
            const currentCursorPosition = editorRef.current?.getPosition();
            const lineContent = editorModel.current?.getLineContent(
              currentCursorPosition?.lineNumber ?? 0
            );
            const contentAfterCursor = lineContent?.substring(
              (currentCursorPosition?.column ?? 0) - 1,
              lineContent.length + 1
            );

            const addition = `"${date.toISOString()}"${contentAfterCursor}`;
            editorRef.current?.executeEdits('time', [
              {
                range: {
                  startLineNumber: currentCursorPosition?.lineNumber ?? 0,
                  startColumn: currentCursorPosition?.column ?? 0,
                  endLineNumber: currentCursorPosition?.lineNumber ?? 0,
                  endColumn: (currentCursorPosition?.column ?? 0) + addition.length + 1,
                },
                text: addition,
                forceMoveMarkers: true,
              },
            ]);

            setPopoverPosition({});

            datePickerOpenStatusRef.current = false;

            // move the cursor past the date we just inserted
            editorRef.current?.setPosition({
              lineNumber: currentCursorPosition?.lineNumber ?? 0,
              column: (currentCursorPosition?.column ?? 0) + addition.length - 1,
            });
            // restore focus to the editor
            editorRef.current?.focus();
          }
        }}
        inline
        showTimeSelect={true}
        shadow={true}
      />
    </PopoverWrapper>
  );
}
