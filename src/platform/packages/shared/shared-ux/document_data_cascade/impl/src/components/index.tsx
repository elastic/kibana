/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { type ComponentProps } from 'react';
import { DataCascadeImpl, DataCascadeImplProps } from './data_cascade_impl';
import { DataCascadeProvider, type GroupNode, type LeafNode } from './store_provider';

export { DataCascadeRow, DataCascadeRowCell } from './data_cascade_impl';
export type { DataCascadeRowProps, DataCascadeRowCellProps } from './data_cascade_impl';
export type { GroupNode, LeafNode } from './store_provider';

export function DataCascade<G extends GroupNode = GroupNode, L extends LeafNode = LeafNode>({
  cascadeGroups,
  ...props
}: DataCascadeImplProps<G, L> & ComponentProps<typeof DataCascadeProvider>) {
  return (
    <DataCascadeProvider cascadeGroups={cascadeGroups}>
      <DataCascadeImpl<G, L> {...props} />
    </DataCascadeProvider>
  );
}
