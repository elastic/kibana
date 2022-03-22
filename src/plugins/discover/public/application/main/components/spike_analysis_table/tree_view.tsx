/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { FC } from 'react';

import { EuiBadge } from '@elastic/eui';

import type { ChangePointsResponseTree } from './use_change_point_detection';

interface TreeViewProps {
  tree: Array<ChangePointsResponseTree['root']>;
}

export const TreeView: FC<TreeViewProps> = ({ tree }) => {
  // const treeItems = useMemo(() => {
  //   let id = 1;
  //   const mapL = (d: ItemSetTreeNode): EuiTreeViewNode => {
  //     id = id + 1;
  //     return {
  //       label:
  //         `(q:${Math.round(d.quality() * 10000) / 10000})` +
  //         `(s:${d.selectedCluster()})` +
  //         Object.entries(d.itemSet.items)
  //           .map(([key, value]) => `${key}:${value.join('/')}`)
  //           .join(),
  //       id: `item_${id}`,
  //       icon: <EuiIcon size="s" type="folderClosed" />,
  //       iconWhenExpanded: <EuiIcon size="s" type="folderOpen" />,
  //       isExpanded: true,
  //       children: d.children().map(mapL),
  //     };
  //   };

  //   return (response?.tree && response?.tree.root.children().map(mapL)) ?? [];
  // }, [response?.tree]);

  return (
    <ul style={{ paddingLeft: '16px' }}>
      {tree.map((d) => {
        const label = Object.entries(d.itemSet.items).map(([key, value]) =>
          value.map((v) => (
            <EuiBadge color="default">
              {key}:{v}
            </EuiBadge>
          ))
        );
        const children = d.children();

        return (
          <li style={{ padding: '2px 0 2px 0', listStyleType: 'disc' }}>
            {label}
            {children.length > 0 && <TreeView tree={children} />}
          </li>
        );
      })}
    </ul>
  );
};
