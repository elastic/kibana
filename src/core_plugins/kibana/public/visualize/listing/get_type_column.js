import React from 'react';

import {
  KuiTableCellLink,
  KuiTableCellIcon,
  SortableTableHeaderColumn
} from 'ui_framework/components';
import { SortableTableHeader } from 'ui_framework/components';
import { getTitleColumn } from 'ui/saved_object_table/get_title_column';
import { getCheckBoxColumn } from 'ui/saved_object_table/get_checkbox_column';

export const TYPE_COLUMN_ID = 'type.title';

export function SortableTypeHeader({ onSort, sortOrder }) {
  return <SortableTableHeaderColumn
    onSort={onSort}
    sortOrder={sortOrder}>
    Type
  </SortableTableHeaderColumn>;
}
SortableTypeHeader.propTypes = {
  onSort: React.PropTypes.any,
  sortOrder: React.PropTypes.any
};

export function getTypeColumn(onSort, sortOrder) {
  return {
    id: 'type',
    getHeaderCell: () => <SortableTypeHeader key={TYPE_COLUMN_ID} onSort={onSort} sortOrder={sortOrder}/>,
    getRowCell: (item) => <KuiTableCellIcon key={item.id + TYPE_COLUMN_ID} title={item.type.title} icon={item.type.icon}/>
  };
}
