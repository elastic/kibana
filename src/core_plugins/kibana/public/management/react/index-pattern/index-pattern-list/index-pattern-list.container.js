import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import { compose } from 'recompose';
import IndexPatternList from './index-pattern-list.component';

import {
  wrapWithSortProps,
  wrapWithPaginateProps,
  wrapWithFilterProps,
} from 'plugins/kibana/management/react/hocs';

import {
  fetchIndexPatterns,
  change,
} from 'plugins/kibana/management/react/store/actions/index-pattern-list';

import {
  getPathToIndexPatterns,
  getPathToListTable,
} from 'plugins/kibana/management/react/store/reducers/index-pattern-list';

import {
  getIndexPatternList,
} from 'plugins/kibana/management/react/reducers';

import store from 'plugins/kibana/management/react/store';

const action = (...args) => store.dispatch(change(...args));

const commonOpts = {
  selectorPath: getPathToListTable(),
  itemsPath: getPathToIndexPatterns(),
  action,
};

export default compose(
  connect(
    state => ({ ...getIndexPatternList(state) }),
    { fetchIndexPatterns }
  ),
  wrapWithFilterProps({
    filters: {
      ['attributes.title']: (value, filterValue) => !filterValue || value.includes(filterValue),
    },
    ...commonOpts,
  }),
  wrapWithSortProps({
    sortBy: 'attributes.title',
    sortAsc: true,
    ...commonOpts,
  }),
  wrapWithPaginateProps({
    perPage: 10,
    page: 0,
    ...commonOpts,
  }),
)(IndexPatternList);
