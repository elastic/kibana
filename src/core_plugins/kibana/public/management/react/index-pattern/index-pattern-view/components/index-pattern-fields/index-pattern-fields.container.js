import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import { compose } from 'recompose';
import IndexPatternFields from './index-pattern-fields.component';

import {
  wrapWithFilterProps,
  wrapWithSortProps,
  wrapWithPaginateProps,
} from 'plugins/kibana/management/react/hocs';

import {
  change,
}  from 'plugins/kibana/management/react/store/actions/index-pattern-view';

import {
  getPathToFields,
  getPathToFieldsTable,
}  from 'plugins/kibana/management/react/store/reducers/index-pattern-view';

import {
  getIndexPatternView,
} from 'plugins/kibana/management/react/reducers';

import store from 'plugins/kibana/management/react/store';

const action = (...args) => store.dispatch(change(...args));

const commonOpts = {
  selectorPath: getPathToFieldsTable(),
  itemsPath: getPathToFields(),
  action,
};

export default compose(
  connect(
    state => ({ ...getIndexPatternView(state) }),
  ),
  wrapWithFilterProps({
    ...commonOpts,
    filters: {
      name: (value, filterValue) => !filterValue || value.includes(filterValue),
      type: (value, filterValue) => !filterValue || filterValue === 'false' || value === filterValue,
    },
  }),
  wrapWithSortProps({
    ...commonOpts,
    sortBy: 'name',
    sortAsc: true,
  }),
  wrapWithPaginateProps({
    ...commonOpts,
    perPage: 10,
    page: 0,
  }),
)(IndexPatternFields);
