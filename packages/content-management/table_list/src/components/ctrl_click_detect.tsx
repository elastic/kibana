/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React, { useEffect, useRef, useCallback } from 'react';
import type { FC, ReactNode, MutableRefObject, MouseEvent as ReactMouseEvent } from 'react';

type ClickHandlerWithMeta = (e: ReactMouseEvent, meta: { isCtrlKey: boolean }) => void;

interface Props {
  onClick: ClickHandlerWithMeta;
  children: (
    ref: MutableRefObject<HTMLButtonElement | null>,
    onClick: (e: ReactMouseEvent) => void
  ) => ReactNode;
}

export const CtrlClickDetect: FC<Props> = ({ onClick, children }) => {
  const elRef = useRef<HTMLButtonElement | null>(null);
  const isMounted = useRef(false);

  const onElClick = useCallback(
    (e: ReactMouseEvent) => {
      e.preventDefault();
      onClick(e, { isCtrlKey: e.ctrlKey });
    },
    [onClick]
  );

  const onElContextmenu = useCallback(
    (e: MouseEvent) => {
      // Disable context menu as on Mac "ctrl + click" equals "right clicking"
      // which opens the context menu
      e.preventDefault();
      onClick(e as unknown as ReactMouseEvent, { isCtrlKey: true });
    },
    [onClick]
  );

  useEffect(() => {
    const el = elRef.current;

    if (el && !isMounted.current && onClick) {
      el.addEventListener('contextmenu', onElContextmenu, false);
    }

    isMounted.current = true;

    return () => {
      if (el) {
        el.removeEventListener('contextmenu', onElContextmenu);
      }
      isMounted.current = false;
    };
  }, [onClick, onElContextmenu]);

  return <>{children(elRef, onElClick)}</>;
};
