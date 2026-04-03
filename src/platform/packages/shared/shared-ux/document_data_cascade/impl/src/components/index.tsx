/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { forwardRef, useMemo, useRef, type ComponentProps, type ForwardedRef } from 'react';
import { DataCascadeImpl, type DataCascadeImplProps } from './data_cascade_impl';
import type { DataCascadeImplRef } from '../lib/core/api';
import { DataCascadeProvider, type GroupNode, type LeafNode } from '../store_provider';

export type { GroupNode, LeafNode, DataCascadeImplProps as DataCascadeProps, DataCascadeImplRef };
export type { DataCascadeUISnapshot, DataCascadeRestorableState } from '../lib/core/api';
export { toRestorableState } from '../lib/core/api';
export { DataCascadeRow, DataCascadeRowCell } from './data_cascade_impl';

export type {
  DataCascadeRowProps,
  DataCascadeRowCellProps,
  CascadeGroupNodeUIInteraction,
} from './data_cascade_impl';

type DataCascadeProviderProps = ComponentProps<typeof DataCascadeProvider>;

export type DataCascadeComponent = <G extends GroupNode = GroupNode, L extends LeafNode = LeafNode>(
  props: Omit<DataCascadeImplProps<G, L>, 'cascadeRef'> &
    DataCascadeProviderProps & { ref?: React.Ref<DataCascadeImplRef<G, L>> }
) => React.ReactElement;

/**
 * Public data cascade component. Forwards the ref to DataCascadeImpl so consumers
 * receive the imperative handle on the ref.
 */
export const DataCascade = forwardRef(function DataCascadeWithProvider<
  G extends GroupNode,
  L extends LeafNode
>(
  {
    cascadeGroups,
    initialGroupColumn,
    customTableHeader,
    tableTitleSlot,
    initialState,
    onCascadeGroupingChange,
    size,
    enableStickyGroupHeader,
    allowMultipleRowToggle,
    children,
    enableRowSelection,
    data,
    overscan,
  }: Omit<DataCascadeImplProps<G, L>, 'cascadeRef'> & DataCascadeProviderProps,
  ref: ForwardedRef<DataCascadeImplRef<G, L>>
) {
  const initialStateRef = useRef(initialState);

  const cascadeImplProps = useMemo<DataCascadeImplProps<G, L>>(() => {
    const props = {
      onCascadeGroupingChange,
      size,
      enableStickyGroupHeader,
      allowMultipleRowToggle,
      enableRowSelection,
      overscan,
      children,
      cascadeRef: ref,
    };

    return customTableHeader
      ? { ...props, customTableHeader }
      : { ...props, tableTitleSlot: tableTitleSlot! };
  }, [
    allowMultipleRowToggle,
    children,
    customTableHeader,
    enableRowSelection,
    overscan,
    onCascadeGroupingChange,
    size,
    enableStickyGroupHeader,
    tableTitleSlot,
    ref,
  ]);

  return useMemo(
    () => (
      <DataCascadeProvider<G, L>
        cascadeGroups={cascadeGroups}
        initialGroupColumn={initialGroupColumn}
        initialState={initialStateRef.current}
        data={data as G[]}
      >
        <DataCascadeImpl<G, L> {...cascadeImplProps} initialState={initialStateRef.current} />
      </DataCascadeProvider>
    ),
    [cascadeGroups, cascadeImplProps, data, initialGroupColumn]
  );
}) as DataCascadeComponent;
