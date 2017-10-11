import React from 'react';
import { connect } from 'react-redux';

import {
  TableProps,
} from 'plugins/kibana/management/react/lib/table_props';

import { IndexPatternResults as IndexPatternResultsComponent } from './index-pattern-results.component';

import {
  getSearchIndicesFiltered,
} from 'plugins/kibana/management/react/store/reducers';

const filter = (item, filterBy) => !filterBy['attributes.title'] || item.attributes.title.includes(filterBy['attributes.title']);

const IndexPatternResults = connect(
  (state, ownProps) => ({ indices: getSearchIndicesFiltered(state, ownProps.isIncludingSystemIndices) }),
)((props) => (
  <TableProps
    sortBy="attributes.title"
    items={props.indices}
    filters={[filter]}
    render={({ items, ...tableProps }) => (
      <IndexPatternResultsComponent indices={items} {...tableProps}/>
    )}
  />
));

export { IndexPatternResults };
