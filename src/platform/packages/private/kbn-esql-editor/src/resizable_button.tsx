/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiResizableButton, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';

export function ResizableButton({
  onMouseDownResizeHandler,
  onKeyDownResizeHandler,
  hasOutline = false,
}: {
  onMouseDownResizeHandler: (
    mouseDownEvent: React.MouseEvent<HTMLButtonElement, MouseEvent> | React.TouchEvent
  ) => void;
  onKeyDownResizeHandler: (keyDownEvernt: React.KeyboardEvent) => void;
  editorIsInline?: boolean;
  hasOutline?: boolean;
}) {
  const { euiTheme } = useEuiTheme();
  return (
    <EuiResizableButton
      data-test-subj="ESQLEditor-resize"
      onMouseDown={onMouseDownResizeHandler}
      onKeyDown={onKeyDownResizeHandler}
      onTouchStart={onMouseDownResizeHandler}
      // Inside the rounded outline a full-width border line would run into the corners, so use the
      // grab handle and inset the button by the corner radius so its hover/focus line stops short of them.
      indicator={hasOutline ? 'handle' : 'border'}
      css={css`
        position: relative;
        ${hasOutline ? `margin-inline: ${euiTheme.border.radius.control};` : ''}
      `}
    />
  );
}
