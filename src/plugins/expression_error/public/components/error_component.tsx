/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useState, useEffect, useCallback, MouseEventHandler } from 'react';
import { EuiIcon } from '@elastic/eui';
import { IInterpreterRenderHandlers } from 'src/plugins/expressions';
import { ErrorRendererConfig } from '../../common/types';
import {
  withSuspense,
  LazyErrorComponent,
  LazyPopoverComponent,
} from '../../../presentation_util/public';
import './error.scss';

const Error = withSuspense(LazyErrorComponent);
const Popover = withSuspense(LazyPopoverComponent);

interface ErrorComponentProps extends ErrorRendererConfig {
  handlers: IInterpreterRenderHandlers;
  parentNode: HTMLElement;
}

function ErrorComponent({ handlers, parentNode, error }: ErrorComponentProps) {
  const [buttonSize, setButtonSize] = useState<number>(0);

  const updateErrorView = useCallback(() => {
    setButtonSize(Math.min(parentNode.clientHeight, parentNode.clientWidth));
  }, [parentNode]);

  useEffect(() => {
    handlers.event({ name: 'onResize', data: updateErrorView });
    return () => {
      handlers.event({ name: 'destroy' });
    };
  }, [handlers, updateErrorView]);

  const button = (handleClick: MouseEventHandler<any>) => (
    <EuiIcon
      className="canvasRenderError__icon"
      onClick={handleClick}
      style={{
        height: buttonSize,
        width: buttonSize,
      }}
      type="alert"
    />
  );

  return (
    <div className="canvasRenderError">
      <Popover button={button}>{() => <Error payload={{ error }} />}</Popover>
    </div>
  );
}

// default export required for React.Lazy
// eslint-disable-next-line import/no-default-export
export { ErrorComponent as default };
