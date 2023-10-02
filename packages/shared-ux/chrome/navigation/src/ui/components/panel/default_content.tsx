/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiTitle } from '@elastic/eui';
import React, { Fragment, type FC } from 'react';

import { PanelGroup } from './panel_group';
import type { PanelNavNode } from './types';

interface Props {
  activeNode: PanelNavNode;
}

export const DefaultContent: FC<Props> = ({ activeNode }) => {
  const totalChildren = activeNode.children?.length ?? 0;
  const firstGroupTitle = activeNode.children?.[0]?.title;
  const firstGroupHasTitle = !!firstGroupTitle && firstGroupTitle !== '';

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
        <>
          {firstGroupHasTitle && <EuiSpacer size="l" />}

          {activeNode.children && (
            <>
              {activeNode.children.map((child, i) => (
                <Fragment key={child.id}>
                  <PanelGroup navNode={child} isFirstInList={i === 0} />
                  {i < totalChildren - 1 && <EuiSpacer size="l" />}
                </Fragment>
              ))}
            </>
          )}
        </>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
