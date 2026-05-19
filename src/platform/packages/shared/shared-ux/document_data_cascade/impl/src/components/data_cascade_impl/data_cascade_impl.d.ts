import React from 'react';
import { type GroupNode, type LeafNode } from '../../store_provider';
import type { DataCascadeImplProps, DataCascadeRowProps, DataCascadeRowCellProps } from './types';
/**
 * @description Public Component for configuring the rendering of a data cascade row cell
 */
export declare const DataCascadeRowCell: <G extends GroupNode, L extends LeafNode>(_props: DataCascadeRowCellProps<G, L>) => null;
/**
 * @description Public Component for configuring the rendering of a data cascade row
 */
export declare const DataCascadeRow: <G extends GroupNode, L extends LeafNode>(_props: DataCascadeRowProps<G, L>) => null;
export declare function DataCascadeImpl<G extends GroupNode, L extends LeafNode>({ onCascadeGroupingChange, size, tableTitleSlot: TableTitleSlot, customTableHeader, overscan, children, enableRowSelection, enableStickyGroupHeader, allowMultipleRowToggle, initialState, cascadeRef, }: DataCascadeImplProps<G, L>): React.JSX.Element;
