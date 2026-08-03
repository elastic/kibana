import React, { type ComponentProps } from 'react';
import { type DataCascadeImplProps } from './data_cascade_impl';
import type { DataCascadeImplRef } from '../lib/core/api';
import { DataCascadeProvider, type GroupNode, type LeafNode } from '../store_provider';
export type { GroupNode, LeafNode, DataCascadeImplProps as DataCascadeProps, DataCascadeImplRef };
export type { DataCascadeUISnapshot, DataCascadeRestorableState } from '../lib/core/api';
export { toRestorableState } from '../lib/core/api';
export { DataCascadeRow, DataCascadeRowCell } from './data_cascade_impl';
export type { DataCascadeRowProps, DataCascadeRowCellProps } from './data_cascade_impl';
type DataCascadeProviderProps = ComponentProps<typeof DataCascadeProvider>;
export type DataCascadeComponent = <G extends GroupNode = GroupNode, L extends LeafNode = LeafNode>(props: Omit<DataCascadeImplProps<G, L>, 'cascadeRef'> & DataCascadeProviderProps & {
    ref?: React.Ref<DataCascadeImplRef<G, L>>;
}) => React.ReactElement;
/**
 * Public data cascade component. Forwards the ref to DataCascadeImpl so consumers
 * receive the imperative handle on the ref.
 */
export declare const DataCascade: DataCascadeComponent;
