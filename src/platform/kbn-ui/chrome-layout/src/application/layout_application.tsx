/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ReactNode } from 'react';
import React, { useLayoutEffect, useRef } from 'react';

import { APP_MAIN_SCROLL_CONTAINER_ID, layoutVarName } from '../constants';

import { styles } from './layout_application.styles';
import { useLayoutConfig } from '../layout_config_context';

const SCROLLBAR_WIDTH_VAR = layoutVarName('application.scrollbar.width');

/**
 * Publishes the scroll container's scrollbar width as a CSS variable. Flyouts portal to the body,
 * so it is set on the document root rather than on the container.
 */
const useScrollbarWidthVar = (scrollContainer: React.RefObject<HTMLDivElement>) => {
  useLayoutEffect(() => {
    const element = scrollContainer.current;
    if (!element) return;
    const { style } = document.documentElement;
    const update = () =>
      style.setProperty(SCROLLBAR_WIDTH_VAR, `${element.offsetWidth - element.clientWidth}px`);
    update();
    // The scrollbar appearing or disappearing resizes the container's content box.
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => {
      observer.disconnect();
      style.removeProperty(SCROLLBAR_WIDTH_VAR);
    };
  }, [scrollContainer]);
};

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
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  useScrollbarWidthVar(scrollContainerRef);

  return (
    <div css={styles.root(appearance)}>
      <div
        ref={scrollContainerRef}
        css={styles.scrollContainer}
        id={APP_MAIN_SCROLL_CONTAINER_ID}
        className="kbnChromeLayoutApplication"
        data-test-subj="kbnChromeLayoutApplication"
        tabIndex={-1}
      >
        {topBar && <div css={styles.topBar}>{topBar}</div>}
        <div css={[styles.content]}>{children}</div>
        {bottomBar && <div css={styles.bottomBar}>{bottomBar}</div>}
      </div>
    </div>
  );
};
