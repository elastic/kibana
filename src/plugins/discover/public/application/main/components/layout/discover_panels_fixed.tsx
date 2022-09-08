/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React, { ReactElement } from 'react';

export const DiscoverPanelsFixed = ({
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
  return (
    <EuiFlexGroup
      className={className}
      direction="column"
      alignItems="stretch"
      gutterSize="none"
      responsive={false}
    >
      {!hideTopPanel && <EuiFlexItem grow={false}>{topPanel}</EuiFlexItem>}
      <EuiFlexItem>{mainPanel}</EuiFlexItem>
    </EuiFlexGroup>
  );
};
