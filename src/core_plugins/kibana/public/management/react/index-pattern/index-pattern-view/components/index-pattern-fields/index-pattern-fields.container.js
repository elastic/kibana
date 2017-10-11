import React from 'react';
import { IndexPatternFields as IndexPatternFieldsComponent } from './index-pattern-fields.component';

import {
  TableProps,
} from 'plugins/kibana/management/react/lib/table_props';

const filter = (item, filterBy) => {
  const { name, type } = filterBy;

  const nameFilters = !name || item.name.includes(name);
  const typeFilters = !type || item.type === type;

  return nameFilters && typeFilters;
};

const IndexPatternFields = (props) => (
  <TableProps
    sortBy="name"
    items={props.fields}
    filters={[filter]}
    render={({ items, ...tableProps }) => (
      <IndexPatternFieldsComponent fields={items} {...tableProps}/>
    )}
  />
);

export { IndexPatternFields };
