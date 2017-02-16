import React from 'react';

import {
  KuiTableCellLink,
  KuiTableCellIcon,
  KuiTableCellLiner,
  SortableTableHeaderColumn
} from 'ui_framework/components';
import { SortableTableHeader } from 'ui_framework/components';
import { ItemTableActions } from 'ui/saved_object_table/item_table_actions';
import { getTitleColumn } from 'ui/saved_object_table/get_title_column';
import { getCheckBoxColumn } from 'ui/saved_object_table/get_checkbox_column';

export const TYPE_COLUMN_ID = 'type.title';

export function SortableTypeHeader({ itemTableState }) {
  return <SortableTableHeaderColumn
    onSort={() => ItemTableActions.doSort(itemTableState, TYPE_COLUMN_ID)}
    sortOrder={itemTableState.getSortOrderFor(TYPE_COLUMN_ID)}>
    Type
  </SortableTableHeaderColumn>;
}
SortableTypeHeader.propTypes = {
  itemTableState: React.PropTypes.any
};

function getTypeColumn(itemTableState) {
  return {
    id: 'type',
    getHeaderCell: () => <SortableTypeHeader key={TYPE_COLUMN_ID} itemTableState={itemTableState}/>,
    getRowCell: (item) => <KuiTableCellIcon key={item.id + TYPE_COLUMN_ID} title={item.type.title} icon={item.type.icon}/>
  };
}

/**
 *
 * @param itemTableState
 * @returns {Array.<ColumnDefinition>}
 */
export function getVisualizeColumns(itemTableState) {
  return [
    getCheckBoxColumn(itemTableState),
    getTitleColumn(itemTableState),
    getTypeColumn(itemTableState)
  ];
}
