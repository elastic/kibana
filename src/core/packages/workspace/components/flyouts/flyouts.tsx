/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { forwardRef, useEffect, useLayoutEffect, useState } from 'react';
import {
  EuiFlyoutResizable,
  EuiFlyoutResizableProps,
  useEuiTheme,
  EuiFlyoutProps,
  EuiFlyout,
} from '@elastic/eui';

export type WorkspaceFlyoutResizableProps = EuiFlyoutResizableProps;

/**
 * A wrapper around EuiFlyoutResizable that controls pushMinBreakpoint relative to main workspace container width
 */
export const WorkspaceFlyoutResizable = forwardRef<HTMLDivElement, WorkspaceFlyoutResizableProps>(
  (props, ref) => {
    const theme = useEuiTheme();
    const mainContainerWidth = useMainContainerWidth();

    if (mainContainerWidth) {
      const { type, pushMinBreakpoint, ...rest } = props;
      const pushMinBreakpointWidth = theme.euiTheme.breakpoint[pushMinBreakpoint ?? 'xl'];
      const typeRelativeToMainContainer =
        mainContainerWidth > pushMinBreakpointWidth ? type : 'overlay';
      return (
        <EuiFlyoutResizable
          ref={ref}
          {...rest}
          type={typeRelativeToMainContainer}
          pushMinBreakpoint={'xs' /* take control of the breakpoint with finalType */}
        />
      );
    } else {
      return <EuiFlyoutResizable ref={ref} {...props} />;
    }
  }
);

export type WorkspaceFlyoutProps = EuiFlyoutProps;
/**
 * A wrapper around EuiFlyout that controls pushMinBreakpoint relative to main workspace container width
 */
export const WorkspaceFlyout = forwardRef<HTMLDivElement, WorkspaceFlyoutProps>((props, ref) => {
  const theme = useEuiTheme();
  const mainContainerWidth = useMainContainerWidth();

  if (mainContainerWidth) {
    const { type, pushMinBreakpoint, ...rest } = props;
    const pushMinBreakpointWidth = theme.euiTheme.breakpoint[pushMinBreakpoint ?? 'xl'];
    const typeRelativeToMainContainer =
      mainContainerWidth > pushMinBreakpointWidth ? type : 'overlay';

    return (
      <EuiFlyout
        ref={ref}
        {...rest}
        type={typeRelativeToMainContainer}
        pushMinBreakpoint={'xs' /* take control of the breakpoint with finalType */}
      />
    );
  } else {
    return <EuiFlyout ref={ref} {...props} />;
  }
});

const mainContainerSelector = 'main';
const useMainContainerWidth = () => {
  const [width, setWidth] = useState<number | null>(null);

  useLayoutEffect(() => {
    const mainContainer = document.querySelector(mainContainerSelector);
    if (!mainContainer) return;

    setWidth(mainContainer.clientWidth);
  }, []);

  useEffect(() => {
    const mainContainer = document.querySelector(mainContainerSelector);
    if (!mainContainer) return;

    const observer = new ResizeObserver(() => {
      setWidth(mainContainer.clientWidth);
    });

    observer.observe(mainContainer);

    return () => {
      observer.disconnect();
    };
  }, []);

  return width;
};
