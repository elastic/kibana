import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import { compose } from 'recompose';
import IndexPatternView from './index-pattern-view.component';

import {
  connectToTransientStore,
  wrapWithSortProps,
  wrapWithPaginateProps,
  wrapWithFilterProps,
} from 'plugins/kibana/management/react/hocs';

import {
  setTransientTableId,
}  from 'plugins/kibana/management/react/store/actions/index-pattern-list';

import {
  getIndexPatternView,
} from 'plugins/kibana/management/react/reducers';

export default compose(
  connect(
    state => ({ ...getIndexPatternView(state) }),
  ),
  // connectToTransientStore({ refSetter: setTransientTableId }),
  // wrapWithFilterProps({ filterKey: 'attributes.title' }),
  // wrapWithSortProps(),
  // wrapWithPaginateProps({ perPage: 1, page: 1 }),
)(IndexPatternView);
