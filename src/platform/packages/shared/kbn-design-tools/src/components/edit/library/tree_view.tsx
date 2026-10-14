/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useMemo } from 'react';
import type { Node } from '@elastic/eui/src/components/tree_view/tree_view';
import { EuiTreeView, EuiIcon, EuiToken } from '@elastic/eui';
import { useSerializableState } from './serializable_state';

const defaultItems: Node[] = [
  {
    id: 'dt-tv-1',
    label: 'src',
    icon: <EuiIcon type="folderOpen" aria-hidden />,
    iconWhenExpanded: <EuiIcon type="folderOpen" aria-hidden />,
    children: [
      {
        id: 'dt-tv-1-1',
        label: 'components',
        icon: <EuiIcon type="folderClosed" aria-hidden />,
        iconWhenExpanded: <EuiIcon type="folderOpen" aria-hidden />,
        children: [
          { id: 'dt-tv-1-1-1', label: 'app.tsx', icon: <EuiToken iconType="tokenFile" /> },
          { id: 'dt-tv-1-1-2', label: 'header.tsx', icon: <EuiToken iconType="tokenFile" /> },
        ],
      },
      { id: 'dt-tv-1-2', label: 'index.ts', icon: <EuiToken iconType="tokenFile" /> },
    ],
  },
  {
    id: 'dt-tv-2',
    label: 'package.json',
    icon: <EuiToken iconType="tokenFile" />,
  },
];

const compressedItems: Node[] = [
  {
    id: 'dt-tv-c1',
    label: 'transporter',
    icon: <EuiIcon type="folderClosed" size="s" aria-hidden />,
    iconWhenExpanded: <EuiIcon type="folderOpen" size="s" aria-hidden />,
    children: [
      { id: 'dt-tv-c1-1', label: 'service', icon: <EuiToken iconType="tokenModule" size="xs" /> },
      { id: 'dt-tv-c1-2', label: 'auth', icon: <EuiToken iconType="tokenKey" size="xs" /> },
    ],
  },
  {
    id: 'dt-tv-c2',
    label: 'getContact',
    icon: <EuiToken iconType="tokenFunction" size="xs" />,
  },
];

/**
 * Recursively annotate tree nodes with `isExpanded` and `callback` so that
 * expansion state is tracked in a serializable attribute and survives
 * duplication/export.
 */
const annotateItems = (
  items: Node[],
  expanded: Set<string>,
  toggle: (id: string) => void
): Node[] =>
  items.map((item) => ({
    ...item,
    isExpanded: expanded.has(item.id),
    callback: () => {
      toggle(item.id);
      return item.id;
    },
    children: item.children ? annotateItems(item.children, expanded, toggle) : undefined,
  }));

export const TreeViewRegular = () => {
  const [expandedStr, setExpandedStr] = useSerializableState('expanded', '');

  const toggle = useCallback(
    (id: string) => {
      setExpandedStr((prev) => {
        const set = new Set(prev ? prev.split(',') : []);
        if (set.has(id)) set.delete(id);
        else set.add(id);
        return [...set].join(',');
      });
    },
    [setExpandedStr]
  );

  const expanded = useMemo(() => new Set(expandedStr ? expandedStr.split(',') : []), [expandedStr]);
  const items = useMemo(() => annotateItems(defaultItems, expanded, toggle), [expanded, toggle]);

  return <EuiTreeView items={items} aria-label="File tree" />;
};

export const TreeViewCompressed = () => {
  const [expandedStr, setExpandedStr] = useSerializableState('expanded', '');

  const toggle = useCallback(
    (id: string) => {
      setExpandedStr((prev) => {
        const set = new Set(prev ? prev.split(',') : []);
        if (set.has(id)) set.delete(id);
        else set.add(id);
        return [...set].join(',');
      });
    },
    [setExpandedStr]
  );

  const expanded = useMemo(() => new Set(expandedStr ? expandedStr.split(',') : []), [expandedStr]);
  const items = useMemo(() => annotateItems(compressedItems, expanded, toggle), [expanded, toggle]);

  return (
    <EuiTreeView
      items={items}
      display="compressed"
      showExpansionArrows
      aria-label="Compressed tree"
    />
  );
};

export const TreeViewExpanded = () => {
  const allIds = useMemo(() => {
    const ids: string[] = [];
    const collect = (nodes: Node[]) => {
      for (const n of nodes) {
        if (n.children) {
          ids.push(n.id);
          collect(n.children);
        }
      }
    };
    collect(defaultItems);
    return ids.join(',');
  }, []);

  const [expandedStr, setExpandedStr] = useSerializableState('expanded', allIds);

  const toggle = useCallback(
    (id: string) => {
      setExpandedStr((prev) => {
        const set = new Set(prev ? prev.split(',') : []);
        if (set.has(id)) set.delete(id);
        else set.add(id);
        return [...set].join(',');
      });
    },
    [setExpandedStr]
  );

  const expanded = useMemo(() => new Set(expandedStr ? expandedStr.split(',') : []), [expandedStr]);
  const items = useMemo(() => annotateItems(defaultItems, expanded, toggle), [expanded, toggle]);

  return <EuiTreeView items={items} aria-label="Expanded tree" />;
};
