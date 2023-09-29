/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiFlexGroup, EuiFlexItem, EuiTitle } from '@elastic/eui';
import React, { type FC } from 'react';

import { PanelNavNode } from './types';

interface Props {
  activeNode: PanelNavNode;
}

export const DefaultContent: FC<Props> = ({ activeNode }) => {
  return (
    <EuiFlexGroup direction="column" gutterSize="m" alignItems="flexStart">
      <EuiFlexItem>
        {typeof activeNode.title === 'string' ? (
          <EuiTitle size="xxs">
            <h2>{activeNode.title}</h2>
          </EuiTitle>
        ) : (
          activeNode.title
        )}
      </EuiFlexItem>
      <EuiFlexItem style={{ width: '100%' }}>
        {activeNode.children && (
          <>
            <div>Render {activeNode.children.length} children here.</div>
          </>
        )}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
