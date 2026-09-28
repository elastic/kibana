/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { FocusEvent, ReactNode } from 'react';
import React, { useCallback, useRef } from 'react';

import { APP_MAIN_SCROLL_CONTAINER_ID } from '../constants';

import { styles } from './layout_application.styles';
import { useLayoutConfig } from '../layout_config_context';

/**
 * The application slot wrapper
 *
 * @param props - Props for the LayoutApplication component.
 * @returns The rendered LayoutApplication component.
 */
export const LayoutApplication = ({
  children,
  topBar,
  bottomBar,
}: {
  children: ReactNode;
  topBar?: ReactNode;
  bottomBar?: ReactNode;
}) => {
  const { appearance } = useLayoutConfig();

  // The container is focusable (tabIndex -1) so the skip link can target it. A mouse click on
  // empty space also focuses it, and Chrome then shows :focus-visible on the next key press
  // (e.g. holding Shift). Flag pointer-initiated focus so the ring only shows for keyboard focus.
  const isPointerDownRef = useRef(false);
  const onPointerDown = useCallback(() => {
    isPointerDownRef.current = true;
    requestAnimationFrame(() => {
      isPointerDownRef.current = false;
    });
  }, []);
  const onFocus = useCallback((e: FocusEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget && isPointerDownRef.current) {
      e.currentTarget.setAttribute('data-pointer-focus', 'true');
    }
  }, []);
  const onBlur = useCallback((e: FocusEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) e.currentTarget.removeAttribute('data-pointer-focus');
  }, []);

  return (
    <div css={styles.root(appearance)}>
      <div
        css={styles.scrollContainer}
        id={APP_MAIN_SCROLL_CONTAINER_ID}
        className="kbnChromeLayoutApplication"
        data-test-subj="kbnChromeLayoutApplication"
        tabIndex={-1}
        onPointerDownCapture={onPointerDown}
        onFocus={onFocus}
        onBlur={onBlur}
      >
        {topBar && <div css={styles.topBar}>{topBar}</div>}
        <div css={[styles.content]}>{children}</div>
        {bottomBar && <div css={styles.bottomBar}>{bottomBar}</div>}
      </div>
    </div>
  );
};
