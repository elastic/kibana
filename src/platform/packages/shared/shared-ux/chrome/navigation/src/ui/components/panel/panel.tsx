/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiCallOut, EuiFlexGroup, EuiFlexItem, EuiHorizontalRule, EuiTitle } from '@elastic/eui';
import type { ChromeProjectNavigationNode, PanelSelectedNode } from '@kbn/core-chrome-browser';
import React, { Fragment, type FC } from 'react';
import { i18n } from '@kbn/i18n';
import { Theme, css } from '@emotion/react';

import { PanelGroup } from './panel_group';
import { PanelNavItem } from './panel_nav_item';

const panelContentStyles = {
  title: ({ euiTheme }: Theme) => css`
    margin: calc(${euiTheme.size.xs} * 2);
    padding-top: calc(${euiTheme.size.xxs} * 3);
    padding-left: calc(${euiTheme.size.xs} * 2);
  `,
  panelNavigation: () => css`
    width: 100%;
  `,
};

function isGroupNode({ children }: Pick<ChromeProjectNavigationNode, 'children'>) {
  return children !== undefined;
}

function isItemNode({ children }: Pick<ChromeProjectNavigationNode, 'children'>) {
  return children === undefined;
}

/**
 * All the children of a panel must be wrapped into groups. This is because a group in DOM is represented by <ul> tags
 * inside the <EuiListGroup/> which then renders the items in <li> insid the <EuiListGroupItem /> component.
 * Having <li> without <ul> is okayish but semantically it is not correct.
 * This function checks if we only have items and automatically wraps them into a group. If there is a mix
 * of items and groups it throws an error.
 *
 * @param node The current active node
 * @returns The children serialized
 * @throws error if the node's children are a mix of items and groups
 */
function serializeChildren(node: PanelSelectedNode): ChromeProjectNavigationNode[] | undefined {
  if (!node.children) return undefined;

  const allChildrenAreItems = node.children.every((_node) => {
    if (isItemNode(_node)) return true;
    return _node.renderAs === 'item';
  });

  if (allChildrenAreItems) {
    // Automatically wrap all the children into top level "root" group.
    return [
      {
        id: 'root',
        path: `${node.path}.root`,
        children: [...node.children],
      },
    ];
  }

  const allChildrenAreGroups = node.children.every((_node) => {
    if (_node.renderAs === 'item') return false;
    return isGroupNode(_node);
  });

  if (!allChildrenAreGroups) {
    throw new Error(
      `[Chrome navigation] Error in node [${node.id}]. Children must either all be "groups" or all "items" but not a mix of both.`
    );
  }

  return node.children;
}

interface Props {
  /** The selected node is the node in the main panel that opens the Panel */
  selectedNode: PanelSelectedNode;
}

export const Panel: FC<Props> = ({ selectedNode }) => {
  const filteredChildren = selectedNode.children?.filter(
    (child) => child.sideNavStatus !== 'hidden'
  );

  let serializedChildren: ChromeProjectNavigationNode[] = [];
  let serializeError: Error | null = null;
  try {
    serializedChildren = serializeChildren({ ...selectedNode, children: filteredChildren }) ?? [];
  } catch (err) {
    serializeError = err;
  }

  if (serializeError) {
    // eslint-disable-next-line no-console
    console.error(serializeError);
    return (
      <EuiCallOut
        color="danger"
        iconType="cross"
        data-test-subj="sideNavPanelError"
        title={i18n.translate(
          'sharedUXPackages.chrome.sideNavigation.panelContent.serializeError',
          { defaultMessage: 'Side navigation parsing error' }
        )}
      >
        {serializeError.message}
      </EuiCallOut>
    );
  }

  return (
    <EuiFlexGroup direction="column" gutterSize="none" alignItems="flexStart">
      {/* Panel title */}
      <EuiFlexItem>
        {typeof selectedNode.title === 'string' ? (
          <EuiTitle size="xxs" css={panelContentStyles.title}>
            <h2 id={`panelTitleId-${selectedNode.id}`}>{selectedNode.title}</h2>
          </EuiTitle>
        ) : (
          selectedNode.title
        )}
      </EuiFlexItem>

      {/* Panel navigation */}
      <EuiFlexItem css={panelContentStyles.panelNavigation}>
        {serializedChildren?.map((child, i) => {
          const isGroup = !!child.children;

          return isGroup ? (
            <Fragment key={child.id}>
              <PanelGroup navNode={child} parentId={selectedNode.id} nodeIndex={i} />
              {i < serializedChildren.length - 1 && <EuiHorizontalRule margin="xs" />}
            </Fragment>
          ) : (
            <PanelNavItem key={child.id} item={child} />
          );
        }) ?? null}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
