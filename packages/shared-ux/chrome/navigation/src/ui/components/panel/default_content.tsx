/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React, { type FC } from 'react';

import { PanelNavNode } from './types';

interface Props {
  activeNode: PanelNavNode;
}

export const DefaultContent: FC<Props> = ({ activeNode }) => {
  return (
    <EuiFlexGroup direction="column" justifyContent="spaceBetween" css={{ height: '100%' }}>
      <EuiFlexItem>{activeNode.title}</EuiFlexItem>
      <EuiFlexItem grow={false} css={{ borderTop: '1px solid #333', paddingTop: '16px' }}>
        Footer
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
