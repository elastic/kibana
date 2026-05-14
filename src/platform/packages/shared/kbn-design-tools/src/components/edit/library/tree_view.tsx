/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiTreeView, EuiIcon, EuiToken } from '@elastic/eui';

const defaultItems = [
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

const compressedItems = [
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

export const TreeViewRegular = () => <EuiTreeView items={defaultItems} aria-label="File tree" />;

export const TreeViewCompressed = () => (
  <EuiTreeView
    items={compressedItems}
    display="compressed"
    showExpansionArrows
    aria-label="Compressed tree"
  />
);

export const TreeViewExpanded = () => (
  <EuiTreeView items={defaultItems} expandByDefault aria-label="Expanded tree" />
);
