import React from 'react';
import type { CascadeRowPrimitiveProps } from '../types';
import { type LeafNode, type GroupNode } from '../../../store_provider';
import { CascadeRowHeaderPrimitive } from './components/cascade_row_header';
export { CascadeRowHeaderPrimitive };
/**
 * @internal
 * @description Internal component that is used to render a row in the data cascade component.
 */
export declare function CascadeRowPrimitive<G extends GroupNode, L extends LeafNode>({ isMobile, activeStickyRenderSlotRef, isActiveSticky, innerRef, onCascadeGroupNodeExpanded, onCascadeGroupNodeCollapsed, rowHeaderTitleSlot: RowTitleSlot, rowHeaderMetaSlots, rowHeaderActions, rowInstance, size, virtualRow, virtualRowStyle, enableRowSelection, getVirtualizer, enableSecondaryExpansionAction, }: CascadeRowPrimitiveProps<G, L>): React.JSX.Element;
