import React from 'react';

import {
  KuiTableCellLink,
  KuiTableCellIcon,
  SortableTableHeaderColumn
} from 'ui_framework/components';
import { SortableTableHeader } from 'ui_framework/components';
import { ItemTableActions } from 'ui/saved_object_table/item_table_actions';
import { getTitleColumn } from 'ui/saved_object_table/get_title_column';
import { getCheckBoxColumn } from 'ui/saved_object_table/get_checkbox_column';

export const TYPE_COLUMN_ID = 'type.title';

export function SortableTypeHeader({ tableActions }) {
  return <SortableTableHeaderColumn
    onSort={tableActions.sort.bind(TYPE_COLUMN_ID)}
    sortOrder={tableActions.getState().getSortOrderFor(TYPE_COLUMN_ID)}>
    Type
  </SortableTableHeaderColumn>;
}
SortableTypeHeader.propTypes = {
  tableActions: React.PropTypes.any
};

function getTypeColumn(tableActions) {
  return {
    id: 'type',
    getHeaderCell: () => <SortableTypeHeader key={TYPE_COLUMN_ID} tableActions={tableActions}/>,
    getRowCell: (item) => <KuiTableCellIcon key={item.id + TYPE_COLUMN_ID} title={item.type.title} icon={item.type.icon}/>
  };
}

/**
 *
 * @param tableActions {ItemTableActions}
 * @param kbnUrl {KbnUrl}
 * @returns {Array.<ColumnDefinition>}
 */
export function getVisualizeColumns(tableActions, kbnUrl) {
  return [
    getCheckBoxColumn(tableActions),
    getTitleColumn(tableActions, kbnUrl),
    getTypeColumn(tableActions)
  ];
}
