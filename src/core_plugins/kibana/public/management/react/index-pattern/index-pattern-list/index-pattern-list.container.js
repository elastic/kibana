import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import { compose } from 'recompose';
import IndexPatternList from './index-pattern-list.component';

import {
  connectToTransientStore,
  wrapWithSortProps,
  wrapWithPaginateProps,
  wrapWithFilterProps,
  rename,
} from 'plugins/kibana/management/react/hocs';

import {
  fetchIndexPatterns,
  setTransientTableId,
} from 'plugins/kibana/management/react/store/actions/index-pattern-list';

import {
  getPathToIndexPatterns,
} from 'plugins/kibana/management/react/store/reducers/index-pattern-list';

import {
  getIndexPatternList,
} from 'plugins/kibana/management/react/reducers';

export default compose(
  connect(
    state => ({ ...getIndexPatternList(state) }),
    { fetchIndexPatterns }
  ),
  connectToTransientStore({ refSetter: setTransientTableId }),
  rename({ from: getPathToIndexPatterns(), to: 'items' }),
  wrapWithFilterProps({
   filters: {
     ['attributes.title']: (value, filterValue) => !filterValue || value.includes(filterValue),
   }
  }),
  wrapWithSortProps(),
  wrapWithPaginateProps({ perPage: 10, page: 0 }),
)(IndexPatternList);
