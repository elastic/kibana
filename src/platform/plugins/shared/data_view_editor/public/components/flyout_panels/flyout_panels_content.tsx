/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect, FC, PropsWithChildren } from 'react';
import { css } from '@emotion/react';
import type { UseEuiTheme } from '@elastic/eui';
import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';

import { useFlyoutPanelContext } from './flyout_panel';

export const PanelContent: FC<PropsWithChildren<unknown>> = (props) => {
  const styles = useMemoCss(componentStyles);
  const { registerContent } = useFlyoutPanelContext();

  useEffect(() => {
    registerContent();
  }, [registerContent]);

  return <div css={styles.content} {...props} />;
};

const componentStyles = {
  content: ({ euiTheme }: UseEuiTheme) =>
    css({
      flex: 1,
      overflowY: 'auto',
      padding: euiTheme.size.l,
    }),
};
