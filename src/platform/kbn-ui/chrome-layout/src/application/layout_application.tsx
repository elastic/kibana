/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ReactNode } from 'react';
import React, { useRef } from 'react';

import { APP_MAIN_SCROLL_CONTAINER_ID } from '@kbn/ui-chrome-layout-constants';
import { ChromeApplicationBreakpointProvider } from '@kbn/ui-chrome-layout-utils';

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
  const { chromeStyle } = useLayoutConfig();
  const applicationRef = useRef<HTMLDivElement>(null);

  return (
    <ChromeApplicationBreakpointProvider targetRef={applicationRef}>
      <div
        ref={applicationRef}
        css={styles.root(chromeStyle)}
        id={APP_MAIN_SCROLL_CONTAINER_ID}
        className="kbnChromeLayoutApplication"
        data-test-subj="kbnChromeLayoutApplication"
      >
        {topBar && <div css={styles.topBar}>{topBar}</div>}
        <div css={[styles.content]}>{children}</div>
        {bottomBar && <div css={styles.bottomBar}>{bottomBar}</div>}
      </div>
    </ChromeApplicationBreakpointProvider>
  );
};
