/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { ReactNode } from 'react';

import { useEuiOverflowScroll } from '@elastic/eui';
import { APP_MAIN_SCROLL_CONTAINER_ID } from '@kbn/core-chrome-layout-constants';

import { styles } from './layout_application.styles';

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
  const overflow = useEuiOverflowScroll('y');

  return (
    <main css={[styles.root, overflow]} id={APP_MAIN_SCROLL_CONTAINER_ID}>
      {topBar && <div css={styles.topBar}>{topBar}</div>}
      <div css={[styles.content]}>{children}</div>
      {bottomBar && <div css={styles.bottomBar}>{bottomBar}</div>}
    </main>
  );
};
