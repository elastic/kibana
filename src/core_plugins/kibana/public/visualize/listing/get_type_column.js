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

export function getTypeColumn() {
  return {
    isSortable: true,
    id: TYPE_COLUMN_ID,
    getHeaderCell: (onSort, sortOrder) => <SortableTypeHeader
      key={TYPE_COLUMN_ID}
      onSort={() => onSort(TYPE_COLUMN_ID)}
      sortOrder={sortOrder}/>,
    getRowCell: (item) => <KuiTableCellIcon key={item.id + TYPE_COLUMN_ID} title={item.type.title} icon={item.type.icon}/>
  };
}
