/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { css } from '@emotion/react';
import type { ReactElement } from 'react';
import React from 'react';

export const PanelsFixed = ({
  className,
  hideTopPanel,
  topPanel,
  mainPanel,
}: {
  className?: string;
  hideTopPanel?: boolean;
  topPanel: ReactElement;
  mainPanel: ReactElement;
}) => {
  // By default a flex item has overflow: visible, min-height: auto, and min-width: auto.
  // This can cause the item to overflow the flexbox parent when its content is too large.
  // Setting the overflow to something other than visible (e.g. auto) resets the min-height
  // and min-width to 0 and makes the item respect the flexbox parent's size.
  // https://stackoverflow.com/questions/36247140/why-dont-flex-items-shrink-past-content-size
  const mainPanelCss = css`
    overflow: auto;
  `;

  return (
    <EuiFlexGroup
      className={className}
      direction="column"
      alignItems="stretch"
      gutterSize="none"
      responsive={false}
    >
      {!hideTopPanel && <EuiFlexItem grow={false}>{topPanel}</EuiFlexItem>}
      <EuiFlexItem css={mainPanelCss}>{mainPanel}</EuiFlexItem>
    </EuiFlexGroup>
  );
};
