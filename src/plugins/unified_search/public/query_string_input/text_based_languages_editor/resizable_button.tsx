/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { EuiFlexGroup } from '@elastic/eui';

import './resizable_button.scss';

export function ResizableButton({
  onMouseDownResizeHandler,
  onKeyDownResizeHandler,
}: {
  onMouseDownResizeHandler: (
    mouseDownEvent: React.MouseEvent<HTMLButtonElement, MouseEvent>
  ) => void;
  onKeyDownResizeHandler: (keyDownEvernt: React.KeyboardEvent) => void;
}) {
  const setFocus = (e: React.MouseEvent<HTMLButtonElement>) => e.currentTarget.focus();

  return (
    <div className="unifiedTextLangEditor--resizableButtonWrapper">
      <EuiFlexGroup
        direction="column"
        gutterSize="none"
        className="unifiedTextLangEditor--resizableButtonContainer"
      >
        <button
          data-test-subj="unifiedTextLangEditor-resize"
          tabIndex={-1}
          className="unifiedTextLangEditor--resizableButton"
          onMouseDown={onMouseDownResizeHandler}
          onKeyDown={onKeyDownResizeHandler}
          onClick={setFocus}
          aria-hidden="true"
        />
      </EuiFlexGroup>
    </div>
  );
}
