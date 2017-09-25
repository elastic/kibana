import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import { compose } from 'recompose';
import IndexPatternFields from './index-pattern-fields.component';

import { get, sortBy as sortByLodash, chunk } from 'lodash';
import React from 'react';

import {
  wrapWithTableProps,
} from 'plugins/kibana/management/react/hocs';

import {
  getPathToFields,
}  from 'plugins/kibana/management/react/store/reducers/index-pattern-view';

import {
  getIndexPatternView,
} from 'plugins/kibana/management/react/reducers';

export default compose(
  connect(
    state => ({ ...getIndexPatternView(state) }),
  ),
  wrapWithTableProps({
    perPage: 10,
    page: 0,
    sortBy: 'name',
    sortAsc: true,
    filters: {
      name: (value, filterValue) => !filterValue || value.includes(filterValue),
      type: (value, filterValue) => !filterValue || filterValue === 'false' || value === filterValue,
    },
    itemsKey: getPathToFields(),
  })
)(IndexPatternFields);
