import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import { compose } from 'recompose';
import IndexPatternView from './index-pattern-view.component';

import {
  wrapWithTabsProps,
  wrapWithSimpleProps,
} from 'plugins/kibana/management/react/hocs';

import {
  refreshFields,
  deleteIndexPattern,
  setDefaultIndexPattern,
  setSelectedTab,
}  from 'plugins/kibana/management/react/store/actions/index-pattern-view';

import {
  getTabs,
}  from 'plugins/kibana/management/react/store/reducers/index-pattern-view';

import {
  getIndexPatternView,
} from 'plugins/kibana/management/react/reducers';

import store from 'plugins/kibana/management/react/store';

const getState = () => getListTable(store.getState());
const setState = (action, ...data) => store.dispatch(action(...data));

export default compose(
  connect(
    state => ({ ...getIndexPatternView(state) }),
    { refreshFields, deleteIndexPattern, setDefaultIndexPattern },
  ),
  wrapWithTabsProps({
    getState: () => getTabs(store.getState()),
    setState: setState.bind(null, setSelectedTab),
    defaults: {
      selectedTab: 'fields',
    },
  }),
  // wrapWithSimpleProps({
  //   statePath: getPathToTransient(),
  //   action,
  //   props: {
  //     isShowingRefreshFieldsConfirmation: false,
  //   },
  //   actions: {
  //     showRefreshFieldsConfirmation: (props) => ({ isShowingRefreshFieldsConfirmation: true }),
  //     hideRefreshFieldsConfirmation: (props) => ({ isShowingRefreshFieldsConfirmation: false }),
  //   }
  // }),
)(IndexPatternView);
