import React from 'react';
import { type GroupNode, type LeafNode } from '../../../store_provider';
import type { CascadeHeaderPrimitiveProps } from '../types';
export declare function CascadeHeaderPrimitive<G extends GroupNode, L extends LeafNode>({ id, customTableHeader, tableTitleSlot: TableTitleSlot, onCascadeGroupingChange, }: CascadeHeaderPrimitiveProps<G>): React.JSX.Element;
