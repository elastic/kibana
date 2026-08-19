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
export const DesignExplorationNavTopControls = ({ isCollapsed }: { isCollapsed: boolean }) => {
  const { euiTheme } = useEuiTheme();
  const switcher = useContextSwitcher();
  const showLabel = !isCollapsed;
  const navSwitcher =
    switcher && isValidElement(switcher)
      ? React.cloneElement(switcher, {
          iconOnly: true,
          showLabel,
        } as Record<string, unknown>)
      : switcher;

  if (!navSwitcher) {
    return null;
  }

  return (
    <div
      css={css`
        display: flex;
        flex-direction: column;
        align-items: ${showLabel ? 'stretch' : 'center'};
        width: 100%;
        padding-top: ${euiTheme.size.xl};
        padding-bottom: ${euiTheme.size.xs};
        padding-inline: ${showLabel ? euiTheme.size.s : 0};
      `}
      data-test-subj="designExplorationNavTopControls"
    >
      <div
        css={css`
          display: flex;
          justify-content: ${showLabel ? 'flex-start' : 'center'};
          width: 100%;

          .euiPopover,
          .euiPopover__anchor {
            width: ${showLabel ? '100%' : 'auto'};
          }
        `}
        data-test-subj="designExplorationNavContextSwitcher"
      >
        {navSwitcher}
      </div>
    </div>
  );
};
