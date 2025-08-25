/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EuiThemeShape } from '@elastic/eui';
import type { Row, CellContext } from '@tanstack/react-table';
import type { VirtualItem } from '@tanstack/react-virtual';
import type { GroupNode, LeafNode } from '../../store_provider';
import type { VirtualizerHelperProps } from '../../lib/core/virtualizer';
import type { SelectionDropdownProps } from './group_selection_combobox/selection_dropdown';

export type DataCascadeRowCellProps<G extends GroupNode, L extends LeafNode> = Pick<
  CascadeRowCellPrimitiveProps<G, L>,
  'onCascadeLeafNodeExpanded' | 'children'
>;

export type DataCascadeRowProps<G extends GroupNode, L extends LeafNode> = Pick<
  CascadeRowPrimitiveProps<G, L>,
  'onCascadeGroupNodeExpanded' | 'rowHeaderMetaSlots' | 'rowHeaderTitleSlot' | 'rowHeaderActions'
> & {
  /**
   * Child element for the cascade row.
   */
  children: React.ReactElement<DataCascadeRowCellProps<G, L>>;
};

export interface DataCascadeImplProps<G extends GroupNode, L extends LeafNode>
  extends Pick<VirtualizerHelperProps<G>, 'overscan'> {
  /**
   * The data to be displayed in the cascade. It should be an array of group nodes.
   */
  data: G[];
  /**
   * Callback function that is called when the group by selection changes.
   */
  onCascadeGroupingChange: SelectionDropdownProps['onSelectionChange'];
  /**
   * The spacing size of the component, can be 's' (small), 'm' (medium), or 'l' (large). Default is 'm'.
   */
  size?: CascadeRowPrimitiveProps<G, L>['size'];
  /**
   * Slot for the table title.
   */
  tableTitleSlot: React.FC<{ rows: Array<Row<G>> }>;
  /**
   * Whether to cause the group root to stick to the top of the viewport.
   */
  stickyGroupRoot?: boolean;
  /**
   * Whether to allow multiple group rows to be expanded at the same time, default is false.
   */
  allowExpandMultiple?: boolean;
  children: React.ReactElement<DataCascadeRowProps<G, L>>;
}

interface OnCascadeLeafNodeExpandedArgs<G extends GroupNode> {
  row: Row<G>;
  /**
   * The path of the row that was expanded in the group by hierarchy.
   */
  nodePath: string[];
  /**
   * KV record of the path values for the row node.
   */
  nodePathMap: Record<string, string>;
}

export interface CascadeRowCellPrimitiveProps<G extends GroupNode, L extends LeafNode>
  extends CellContext<G, unknown> {
  /**
   * Size of the row cell
   */
  size: keyof Pick<EuiThemeShape['size'], 's' | 'm' | 'l'>;
  /**
   * Callback invoked when a leaf node gets expanded, which can be used to fetch data for leaf nodes.
   */
  onCascadeLeafNodeExpanded: (args: OnCascadeLeafNodeExpandedArgs<G>) => Promise<L[]>;
  children: (args: { data: L[] | null }) => React.ReactNode;
}

interface OnCascadeGroupNodeExpandedArgs<G extends GroupNode> {
  row: Row<G>;
  /**
   * @description The path of the row that was expanded in the group by hierarchy.
   */
  nodePath: string[];
  /**
   * @description KV record of the path values for the row node.
   */
  nodePathMap: Record<string, string>;
}

/**
 * @internal
 * @description Internal cascade row primitive component props.
 */
export interface CascadeRowPrimitiveProps<G extends GroupNode, L extends LeafNode> {
  isActiveSticky: boolean;
  innerRef: React.LegacyRef<HTMLDivElement>;
  /**
   * @description Callback function that is called when a cascade node is expanded.
   */
  onCascadeGroupNodeExpanded: (args: OnCascadeGroupNodeExpandedArgs<G>) => Promise<G[]>;
  /**
   * @description The row instance for the cascade row.
   */
  rowInstance: Row<G>;
  /**
   * @description The row header title slot for the cascade row.
   */
  rowHeaderTitleSlot: React.FC<{ row: Row<G> }>;
  /**
   * @description The row header meta slots for the cascade row.
   */
  rowHeaderMetaSlots?: (props: { row: Row<G> }) => React.ReactNode[];
  /**
   * @description The row header actions slot for the cascade row.
   */
  rowHeaderActions?: (props: { row: Row<G> }) => React.ReactNode[];
  /**
   * @description The size of the row component, can be 's' (small), 'm' (medium), or 'l' (large).
   */
  size: CascadeRowCellPrimitiveProps<G, L>['size'];
  /**
   * @description The virtual row for the cascade row.
   */
  virtualRow: VirtualItem;
  /**
   * @description The virtual row style for the cascade row.
   */
  virtualRowStyle: React.CSSProperties;
}
