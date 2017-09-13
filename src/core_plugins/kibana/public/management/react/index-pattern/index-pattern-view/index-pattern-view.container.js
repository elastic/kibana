import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import { compose } from 'recompose';
import IndexPatternView from './index-pattern-view.component';

import {
  connectToTransientStore,
  wrapWithTabsProps,
  wrapWithSimpleProps,
} from 'plugins/kibana/management/react/hocs';

import {
  setTransientId,
  refreshFields,
  deleteIndexPattern,
  setDefaultIndexPattern,
}  from 'plugins/kibana/management/react/store/actions/index-pattern-view';

import {
  getIndexPatternView,
} from 'plugins/kibana/management/react/reducers';

export default compose(
  connect(
    state => ({ ...getIndexPatternView(state) }),
    { refreshFields, deleteIndexPattern, setDefaultIndexPattern },
  ),
  connectToTransientStore({ refSetter: setTransientId }),
  wrapWithTabsProps({ selectedTab: 'fields' }),
  wrapWithSimpleProps({
    props: {
      isShowingRefreshFieldsConfirmation: false,
    },
    actions: {
      showRefreshFieldsConfirmation: (props) => ({ isShowingRefreshFieldsConfirmation: true }),
      hideRefreshFieldsConfirmation: (props) => ({ isShowingRefreshFieldsConfirmation: false }),
    }
  }),
)(IndexPatternView);
