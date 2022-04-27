/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { EuiIcon, useResizeObserver, EuiPopover } from '@elastic/eui';
import { IInterpreterRenderHandlers } from '@kbn/expressions-plugin';
import { withSuspense } from '@kbn/presentation-util-plugin/public';
import { ErrorRendererConfig } from '../../common/types';
import { LazyErrorComponent } from '.';

const Error = withSuspense(LazyErrorComponent);

interface ErrorComponentProps extends ErrorRendererConfig {
  onLoaded: IInterpreterRenderHandlers['done'];
  parentNode: HTMLElement;
}

function ErrorComponent({ onLoaded, parentNode, error }: ErrorComponentProps) {
  const getButtonSize = (node: HTMLElement) => Math.min(node.clientHeight, node.clientWidth);
  const parentNodeDimensions = useResizeObserver(parentNode);

  const [buttonSize, setButtonSize] = useState<number>(getButtonSize(parentNode));
  const [isPopoverOpen, setPopoverOpen] = useState<boolean>(false);

  const handlePopoverClick = () => setPopoverOpen(!isPopoverOpen);

  const closePopover = () => setPopoverOpen(false);

  const updateErrorView = useCallback(() => {
    setButtonSize(getButtonSize(parentNode));
    onLoaded();
  }, [parentNode, onLoaded]);

  useEffect(() => {
    updateErrorView();
  }, [parentNodeDimensions, updateErrorView]);

  return (
    <div className="canvasRenderError">
      <EuiPopover
        closePopover={closePopover}
        button={
          <EuiIcon
            className="canvasRenderError__icon"
            onClick={handlePopoverClick}
            style={{
              height: buttonSize,
              width: buttonSize,
            }}
            type="alert"
          />
        }
        isOpen={isPopoverOpen}
      >
        <Error payload={{ error }} onClose={closePopover} />
      </EuiPopover>
    </div>
  );
}

// default export required for React.Lazy
// eslint-disable-next-line import/no-default-export
export { ErrorComponent as default };
