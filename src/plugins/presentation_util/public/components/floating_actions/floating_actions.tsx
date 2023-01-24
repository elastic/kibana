/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React, { FC, ReactElement, useCallback, useRef, useState } from 'react';

import { EuiPortal, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import useMount from 'react-use/lib/useMount';

export interface FloatingActionsProps {
  className?: string;
  actions?: JSX.Element;
  children: ReactElement;
  isEnabled?: boolean;
  usingTwoLineLayout?: boolean;
}

export const FloatingActions: FC<FloatingActionsProps> = ({
  className = '',
  actions,
  isEnabled,
  usingTwoLineLayout,
  children,
}) => {
  const { euiTheme } = useEuiTheme();
  const anchorRef = useRef<HTMLSpanElement>(null);
  const actionsRef = useRef<HTMLDivElement>(null);
  const [areFloatingActionsVisible, setFloatingActionsVisible] = useState<boolean>(false);

  const showFloatingActions = useCallback(
    () => setFloatingActionsVisible(true),
    [setFloatingActionsVisible]
  );
  const hideFloatingActions = useCallback(
    () => setFloatingActionsVisible(false),
    [setFloatingActionsVisible]
  );
  const anchorBoundingRect = anchorRef.current?.getBoundingClientRect();
  const actionsBoundingRect = actionsRef.current?.getBoundingClientRect();

  const hiddenActionsStyles = `
  visibility: hidden;
  opacity: 0;

  // slower transition on hover leave in case the user accidentally stops hover
  transition: visibility 0.3s, opacity 0.3s;
  `;
  const visibleActionsStyles = `
  transition: visibility 0.1s, opacity 0.1s;
  visibility: visible;
  opacity: 1;
  `;

  const floatingActionStyles =
    anchorBoundingRect && actionsBoundingRect
      ? css`
          top: ${anchorBoundingRect.top -
          (usingTwoLineLayout ? parseInt(euiTheme.size.xs, 10) : parseInt(euiTheme.size.l, 10))}px;
          left: ${anchorBoundingRect.right -
          actionsBoundingRect.width -
          parseInt(euiTheme.size.xs, 10)}px;

          ${areFloatingActionsVisible ? visibleActionsStyles : hiddenActionsStyles}
        `
      : undefined;

  return (
    <>
      <span
        className="floatingActions__anchor"
        ref={anchorRef}
        onMouseEnter={showFloatingActions}
        onMouseOver={showFloatingActions}
        onFocus={showFloatingActions}
        onMouseLeave={hideFloatingActions}
        onBlur={hideFloatingActions}
      >
        {children}
      </span>

      <EuiPortal>
        <div
          ref={actionsRef}
          className={className}
          css={floatingActionStyles}
          onMouseOver={showFloatingActions}
          onFocus={showFloatingActions}
        >
          {actions}
        </div>
      </EuiPortal>
    </>
  );
};

// required for dynamic import using React.lazy()
// eslint-disable-next-line import/no-default-export
export default FloatingActions;
