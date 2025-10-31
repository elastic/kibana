/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type React from 'react';
import type { EuiThemeShape, EuiButtonIconProps, EuiButtonEmptyProps } from '@elastic/eui';
import type { Table, CellContext, Row } from '@tanstack/react-table';
import type { VirtualItem } from '@tanstack/react-virtual';
import type { GroupNode, LeafNode } from '../../store_provider';
import type { CascadeVirtualizerProps } from '../../lib/core/virtualizer';
import type { SelectionDropdownProps } from './data_cascade_header/group_selection_combobox/selection_dropdown';

/**
 * Sizing options for the cascade components, can be 's' (small), 'm' (medium), or 'l' (large). Default is 'm'.
 */
export type CascadeSizing = keyof Pick<EuiThemeShape['size'], 's' | 'm' | 'l'>;

interface OnCascadeLeafNodeExpandedArgs<G extends GroupNode> {
  row: G;
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
  size: CascadeSizing;
  /**
   * Callback invoked when a leaf node gets expanded, which can be used to fetch data for leaf nodes.
   */
  onCascadeLeafNodeExpanded: (args: OnCascadeLeafNodeExpandedArgs<G>) => Promise<L[]>;
  /**
   * Render prop function that provides the leaf node data when available, which can be used to render the content we'd to display with the data received.
   */
  children: (args: { data: L[] | null; cellId: string }) => React.ReactNode;
}

interface OnCascadeGroupNodeExpandedArgs<G extends GroupNode> {
  row: G;
  /**
   * @description The path of the row that was expanded in the group by hierarchy.
   */
  nodePath: string[];
  /**
   * @description KV record of the path values for the row node.
   */
  nodePathMap: Record<string, string>;
}

export interface CascadeRowActionProps {
  hideOver?: number;
  headerRowActions: Array<
    Pick<EuiButtonIconProps, 'iconType' | 'aria-label' | 'data-test-subj'> & {
      onClick: (e: React.MouseEvent<Element>) => void;
    } & (
        | {
            label?: React.ReactNode;
          }
        | {
            label: React.ReactNode;
            iconSide?: EuiButtonEmptyProps['iconSide'];
          }
      )
  >;
}

export interface CascadeRowHeaderPrimitiveProps<G extends GroupNode, L extends LeafNode> {
  /**
   * Whether to enable row selection. Default is false.
   */
  enableRowSelection?: boolean;
  /**
   * Whether to enable secondary expansion for nodes. Default is false.
   */
  enableSecondaryExpansionAction?: boolean;
  /**
   * Denotes if the row is a group node or a leaf node.
   */
  isGroupNode: boolean;
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
  rowHeaderTitleSlot: React.FC<{ rowData: G; nodePath: string[] }>;
  /**
   * @description The row header meta slots for the cascade row.
   */
  rowHeaderMetaSlots?: (props: { rowData: G; nodePath: string[] }) => React.ReactNode[];
  /**
   * @description The row header actions slot for the cascade row.
   */
  rowHeaderActions?: (params: {
    rowData: G;
    nodePath: string[];
  }) => CascadeRowActionProps['headerRowActions'];
  /**
   * @description The size of the row component, can be 's' (small), 'm' (medium), or 'l' (large).
   */
  size: CascadeRowCellPrimitiveProps<G, L>['size'];
}

/**
 * @internal
 * @description Internal cascade row primitive component props.
 */
export interface CascadeRowPrimitiveProps<G extends GroupNode, L extends LeafNode>
  extends Omit<CascadeRowHeaderPrimitiveProps<G, L>, 'isGroupNode'> {
  /**
   * ref used to portal the active sticky header.
   */
  activeStickyRenderSlotRef: React.RefObject<HTMLDivElement | null>;
  isActiveSticky: boolean;
  innerRef: React.LegacyRef<HTMLDivElement>;
  /**
   * @description The virtual row for the cascade row.
   */
  virtualRow: VirtualItem;
  /**
   * @description The virtual row style for the cascade row.
   */
  virtualRowStyle: React.CSSProperties;
}

export type DataCascadeRowCellProps<G extends GroupNode, L extends LeafNode> = Pick<
  CascadeRowCellPrimitiveProps<G, L>,
  'onCascadeLeafNodeExpanded' | 'children'
>;

export type DataCascadeRowProps<G extends GroupNode, L extends LeafNode> = Pick<
  CascadeRowPrimitiveProps<G, L>,
  | 'onCascadeGroupNodeExpanded'
  | 'rowHeaderMetaSlots'
  | 'rowHeaderTitleSlot'
  | 'rowHeaderActions'
  | 'enableSecondaryExpansionAction'
> & {
  /**
   * Child element for the cascade row.
   */
  children: React.ReactElement<DataCascadeRowCellProps<G, L>>;
};

export interface CascadeHeaderPrimitiveProps<G extends GroupNode> {
  tableInstance: Table<G>;
  onCascadeGroupingChange: SelectionDropdownProps['onSelectionChange'];
  customTableHeader?: (props: {
    availableColumns: string[];
    currentSelectedColumns: string[];
    onGroupSelection: (groupByColumn: string[]) => void;
    selectedRows: string[];
  }) => React.ReactNode;
  /**
   * Slot for the table title.
   */
  tableTitleSlot: React.FC;
}

/**
 * @internal
 */
interface DataCascadeImplBaseProps<G extends GroupNode, L extends LeafNode>
  extends Pick<CascadeVirtualizerProps<G>, 'overscan'>,
    Pick<CascadeRowPrimitiveProps<G, L>, 'enableRowSelection'> {
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
   * Enabling this options causes the group header to stick to the top of the table when toggled and scrolling. Default is true.
   */
  enableStickyGroupHeader?: boolean;
  /**
   * Whether to allow multiple group rows to be expanded at the same time, default is false.
   */
  allowMultipleRowToggle?: boolean;
  children: React.ReactElement<DataCascadeRowProps<G, L>>;
}

export type DataCascadeImplProps<
  G extends GroupNode,
  L extends LeafNode
> = DataCascadeImplBaseProps<G, L> &
  (
    | {
        customTableHeader: NonNullable<CascadeHeaderPrimitiveProps<G>['customTableHeader']>;
        tableTitleSlot?: never;
      }
    | {
        customTableHeader?: never;
        /**
         * Slot for the table title.
         */
        tableTitleSlot: CascadeHeaderPrimitiveProps<G>['tableTitleSlot'];
      }
  );
