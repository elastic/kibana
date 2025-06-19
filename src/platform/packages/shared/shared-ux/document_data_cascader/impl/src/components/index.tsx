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
import { DataCascadeProvider, type GroupNode, type LeafNode } from './data_cascade_provider';

export function DataCascade<N extends GroupNode = GroupNode, L extends LeafNode = LeafNode>({
  cascadeGroups,
  ...props
}: DataCascadeImplProps<N, L> & ComponentProps<typeof DataCascadeProvider>) {
  return (
    <DataCascadeProvider cascadeGroups={cascadeGroups}>
      <DataCascadeImpl<N, L> {...props} />
    </DataCascadeProvider>
  );
}
