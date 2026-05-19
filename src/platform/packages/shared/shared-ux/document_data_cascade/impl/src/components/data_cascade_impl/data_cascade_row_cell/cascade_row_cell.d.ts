import React from 'react';
import type { CascadeRowCellPrimitiveProps } from '../types';
import { type GroupNode, type LeafNode } from '../../../store_provider';
export declare function CascadeRowCellPrimitive<G extends GroupNode, L extends LeafNode>({ children, getVirtualizer, onCascadeLeafNodeExpanded, onCascadeLeafNodeCollapsed, row, size, }: CascadeRowCellPrimitiveProps<G, L>): React.JSX.Element;
