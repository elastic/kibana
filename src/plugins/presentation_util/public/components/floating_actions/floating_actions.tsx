/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React, { FC, ReactElement, useCallback, useEffect, useRef, useState } from 'react';

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

interface FloatingActionsPosition {
  top: number;
  left: number;
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

  const [position, setPosition] = useState<FloatingActionsPosition>({
    top: 0,
    left: 0,
  });
  const [areFloatingActionsVisible, setFloatingActionsVisible] = useState<boolean>(false);

  const showFloatingActions = useCallback(
    () => isEnabled && !areFloatingActionsVisible && setFloatingActionsVisible(true),
    [isEnabled, areFloatingActionsVisible, setFloatingActionsVisible]
  );
  const hideFloatingActions = useCallback(
    () => areFloatingActionsVisible && setFloatingActionsVisible(false),
    [areFloatingActionsVisible, setFloatingActionsVisible]
  );

  const updatePosition = useCallback(() => {
    if (anchorRef.current && actionsRef.current) {
      const anchorBoundingRect = anchorRef.current?.getBoundingClientRect();
      const actionsBoundingRect = actionsRef.current?.getBoundingClientRect();

      const top =
        anchorBoundingRect.top -
        (usingTwoLineLayout ? parseInt(euiTheme.size.xs, 10) : parseInt(euiTheme.size.l, 10)) +
        window.scrollY;
      const left =
        anchorBoundingRect.right -
        actionsBoundingRect.width -
        parseInt(euiTheme.size.xs, 10) +
        window.scrollX;

      if (position.top !== top || position.left !== left) {
        setPosition({ top, left });
      }
    }
  }, [anchorRef, actionsRef, euiTheme.size, position, usingTwoLineLayout]);

  const floatingActionsStyles = css`
    top: ${position.top}px;
    left: ${position.left}px;

    ${areFloatingActionsVisible ? visibleActionsStyles : hiddenActionsStyles}
  `;

  useEffect(updatePosition);

  useMount(() => {
    window.addEventListener('scroll', updatePosition, true);
    return () => window.removeEventListener('scroll', updatePosition, true);
  });

  return (
    <>
      <span
        className="floatingActions__anchor"
        ref={anchorRef}
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
          css={floatingActionsStyles}
          onMouseOver={showFloatingActions}
          onFocus={showFloatingActions}
          onMouseLeave={hideFloatingActions}
          onBlur={hideFloatingActions}
        >
          {actions}
        </div>
      </EuiPortal>
    </>
  );
};
