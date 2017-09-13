import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import { compose } from 'recompose';
import IndexPatternFields from './index-pattern-fields.component';

import {
  connectToTransientStore,
  wrapWithFilterProps,
  wrapWithSortProps,
  wrapWithPaginateProps,
  rename,
} from 'plugins/kibana/management/react/hocs';

import {
  setResultsTransientId,
}  from 'plugins/kibana/management/react/store/actions/index-pattern-view';

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
  connectToTransientStore({ refSetter: setResultsTransientId }),
  rename({ from: getPathToFields(), to: 'items' }),
  wrapWithFilterProps({
   filters: {
     name: (value, filterValue) => !filterValue || value.includes(filterValue),
     type: (value, filterValue) => !filterValue || filterValue === 'false' || value === filterValue,
   }
  }),
  wrapWithSortProps({ sortBy: 'name', sortAsc: true }),
  wrapWithPaginateProps({ perPage: 10, page: 0 }),
)(IndexPatternFields);
