/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiResizableButton } from '@elastic/eui';
import { css } from '@emotion/react';

export function ResizableButton({
  onMouseDownResizeHandler,
  onKeyDownResizeHandler,
}: {
  onMouseDownResizeHandler: (
    mouseDownEvent: React.MouseEvent<HTMLButtonElement, MouseEvent> | React.TouchEvent
  ) => void;
  onKeyDownResizeHandler: (keyDownEvernt: React.KeyboardEvent) => void;
  editorIsInline?: boolean;
}) {
  return (
    <EuiResizableButton
      data-test-subj="ESQLEditor-resize"
      onMouseDown={onMouseDownResizeHandler}
      onKeyDown={onKeyDownResizeHandler}
      onTouchStart={onMouseDownResizeHandler}
      indicator="border"
      css={css`
        position: relative;
      `}
    />
  );
}
