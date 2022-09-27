/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import type { FC } from 'react';

import './resizable_button.scss';

export interface ResizableButtonProps {
  onMouseDownResizeHandler: (
    mouseDownEvent: React.MouseEvent<HTMLButtonElement, MouseEvent>
  ) => void;
  onKeyDownResizeHandler: (keyDownEvent: React.KeyboardEvent) => void;
}

export const ResizableButton: FC<ResizableButtonProps> = ({
  onMouseDownResizeHandler,
  onKeyDownResizeHandler,
}) => {
  const setFocus = (e: React.MouseEvent<HTMLButtonElement>) => e.currentTarget.focus();

  return (
    <div className="unifiedTextLangEditor--resizableButtonContainer">
      <button
        data-test-subj="unifiedTextLangEditor-resize"
        className="unifiedTextLangEditor--resizableButton"
        onMouseDown={onMouseDownResizeHandler}
        onKeyDown={onKeyDownResizeHandler}
        onClick={setFocus}
      />
    </div>
  );
};
