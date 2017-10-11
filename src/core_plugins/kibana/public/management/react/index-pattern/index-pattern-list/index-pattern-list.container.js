import React, { Component } from 'react';
import { connect } from 'react-redux';
import { IndexPatternList as IndexPatternListComponent } from './index-pattern-list.component';

import {
  TableProps,
} from 'plugins/kibana/management/react/lib/table_props';

import {
  fetchIndexPatterns,
} from 'plugins/kibana/management/react/store/actions';

import {
  getIndexPatterns,
} from 'plugins/kibana/management/react/store/reducers';

const filter = (item, filterBy) => !filterBy['attributes.title'] || item.attributes.title.includes(filterBy['attributes.title']);

const IndexPatternList = connect(
  state => ({ indexPatterns: getIndexPatterns(state) }),
  { fetchIndexPatterns },
)(class extends Component {
  componentWillMount() {
    this.props.fetchIndexPatterns();
  }
  render() {
    const { indexPatterns } = this.props;
    return (
      <TableProps
        sortBy="attributes.title"
        items={indexPatterns}
        filters={[filter]}
        render={({ items, ...tableProps }) => (
          <IndexPatternListComponent indexPatterns={items} {...tableProps}/>
        )}
      />
    );
  }
});

export { IndexPatternList };
