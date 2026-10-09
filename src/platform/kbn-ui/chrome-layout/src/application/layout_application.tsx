/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ReactNode } from 'react';
import React from 'react';
import { EUI_BREAKPOINT_CONTAINER_ATTRIBUTE } from '@elastic/eui';

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

  return (
    // The JS breakpoint hooks measure this element. Pairs with `euiBreakpointContainer` in the root styles.
    <div css={styles.root(appearance)} {...{ [EUI_BREAKPOINT_CONTAINER_ATTRIBUTE]: true }}>
      <div
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
