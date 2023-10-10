/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiTitle } from '@elastic/eui';
import { ChromeProjectNavigationNode } from '@kbn/core-chrome-browser';
import React, { Fragment, type FC } from 'react';

import { isGroupNode, isItemNode } from '../../../utils';
import { PanelGroup } from './panel_group';
import type { PanelNavNode } from './types';

/**
 * All the children of a panel must be wrapped into groups. This means that when there is only a single
 * group with 3 links it forces the consumer to add an extra wrapper group. To simplify that we automatically
 * wrap all the children into a single group when we detect that all are items.
 *
 * @param node The current active node
 * @returns The children serialized
 */
function serializeChildren(node: PanelNavNode): ChromeProjectNavigationNode[] | undefined {
  if (!node.children) return undefined;

  const allChildrenAreItems = node.children.every((_node) => {
    if (isItemNode(_node)) return true;
    return _node.sideNavStatus === 'renderAsItem';
  });

  if (allChildrenAreItems) {
    // Automatically wrap all the children into top level "root" group.
    return [
      {
        id: 'root',
        title: '',
        path: [...node.path, 'root'],
        children: [...node.children],
      },
    ];
  }

  const allChildrenAreGroups = node.children.every(isGroupNode);

  if (!allChildrenAreGroups) {
    throw new Error(
      `[Chrome navigation] Error in node [${node.id}]. Children must either all be "groups" or all "items" but not a mix of both.`
    );
  }

  return node.children;
}

interface Props {
  activeNode: PanelNavNode;
}

export const DefaultContent: FC<Props> = ({ activeNode }) => {
  const serializedChildren = serializeChildren(activeNode);
  const filteredChildren = serializedChildren?.filter((child) => child.sideNavStatus !== 'hidden');
  const totalChildren = filteredChildren?.length ?? 0;
  const firstGroupTitle = filteredChildren?.[0]?.title;
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

          {filteredChildren && (
            <>
              {filteredChildren.map((child, i) => {
                const hasHorizontalRuleBefore =
                  i === 0 ? false : !!filteredChildren?.[i - 1]?.appendHorizontalRule;

                return (
                  <Fragment key={child.id}>
                    <PanelGroup
                      navNode={child}
                      isFirstInList={i === 0}
                      hasHorizontalRuleBefore={hasHorizontalRuleBefore}
                    />
                    {i < totalChildren - 1 && (
                      <EuiSpacer size={child.appendHorizontalRule ? 'm' : 'l'} />
                    )}
                  </Fragment>
                );
              })}
            </>
          )}
        </>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
