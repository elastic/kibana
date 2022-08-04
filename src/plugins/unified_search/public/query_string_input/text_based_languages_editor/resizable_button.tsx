/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';

import './resizable_button.scss';

export function ResizableButton({
  onMouseDownResizeHandler,
  onKeyDownResizeHandler,
}: {
  onMouseDownResizeHandler: (mouseDownEvent: React.MouseEvent<HTMLDivElement, MouseEvent>) => void;
  onKeyDownResizeHandler: (keyDownEvernt: React.KeyboardEvent) => void;
}) {
  const setFocus = (e: React.MouseEvent<HTMLDivElement>) => e.currentTarget.focus();

  return (
    // <div className="unifiedTextLangEditor--resizableButtonContainer">
    <div
      data-test-subj="unifiedTextLangEditor-resize"
      tabIndex={-1}
      className="unifiedTextLangEditor--resizableButton"
      onMouseDown={onMouseDownResizeHandler}
      onKeyDown={onKeyDownResizeHandler}
      onClick={setFocus}
      aria-hidden="true"
    />
    // </div>
  );
}
