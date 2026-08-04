import React from 'react';
import { type GroupNode, type LeafNode } from '../../../../store_provider';
import type { CascadeRowHeaderPrimitiveProps } from '../../types';
/**
 * @internal
 */
export declare function CascadeRowHeaderPrimitive<G extends GroupNode, L extends LeafNode>({ isMobile, rowInstance, rowHeaderTitleSlot: RowTitleSlot, rowHeaderMetaSlots, rowHeaderActions, size, enableRowSelection, enableSecondaryExpansionAction, isGroupNode, onCascadeGroupNodeExpanded, onCascadeGroupNodeCollapsed, }: CascadeRowHeaderPrimitiveProps<G, L>): React.JSX.Element;
