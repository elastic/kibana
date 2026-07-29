/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { isValidElement } from 'react';
import { css } from '@emotion/react';
import { useEuiTheme } from '@elastic/eui';
import { useContextSwitcher } from '../shared/chrome_hooks';

/** Deployment/context switcher as a grid icon for headerless design-exploration nav. */
export const DesignExplorationNavTopControls = () => {
  const { euiTheme } = useEuiTheme();
  const switcher = useContextSwitcher();
  const navSwitcher =
    switcher && isValidElement(switcher)
      ? React.cloneElement(switcher, { iconOnly: true } as Record<string, unknown>)
      : switcher;

  if (!navSwitcher) {
    return null;
  }

  return (
    <div
      css={css`
        display: flex;
        flex-direction: column;
        align-items: center;
        width: 100%;
        padding-top: ${euiTheme.size.s};
        padding-bottom: ${euiTheme.size.xs};
      `}
      data-test-subj="designExplorationNavTopControls"
    >
      <div
        css={css`
          display: flex;
          justify-content: center;
          width: 100%;
        `}
        data-test-subj="designExplorationNavContextSwitcher"
      >
        {navSwitcher}
      </div>
    </div>
  );
};
