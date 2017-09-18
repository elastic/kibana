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
  change,
}  from 'plugins/kibana/management/react/store/actions/index-pattern-view';

import {
  getPathToTabs,
  getPathToTransient,
}  from 'plugins/kibana/management/react/store/reducers/index-pattern-view';

import {
  getIndexPatternView,
} from 'plugins/kibana/management/react/reducers';

import store from 'plugins/kibana/management/react/store';

const action = (...args) => store.dispatch(change(...args));

export default compose(
  connect(
    state => ({ ...getIndexPatternView(state) }),
    { refreshFields, deleteIndexPattern, setDefaultIndexPattern },
  ),
  wrapWithTabsProps({
    tabsPath: getPathToTabs(),
    selectedTab: 'fields',
    action,
  }),
  wrapWithSimpleProps({
    statePath: getPathToTransient(),
    action,
    props: {
      isShowingRefreshFieldsConfirmation: false,
    },
    actions: {
      showRefreshFieldsConfirmation: (props) => ({ isShowingRefreshFieldsConfirmation: true }),
      hideRefreshFieldsConfirmation: (props) => ({ isShowingRefreshFieldsConfirmation: false }),
    }
  }),
)(IndexPatternView);
