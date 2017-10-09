import React, { Component } from 'react';
import { connect } from 'react-redux';
import { compose } from 'recompose';
import { IndexPatternView as IndexPatternViewComponent } from './index-pattern-view.component';

import {
  wrapWithTabsProps,
  wrapWithProps,
} from 'plugins/kibana/management/react/hocs';

import {
  refreshFields,
  deleteIndexPattern,
  setDefaultIndexPattern,
  fetchIndexPattern,
} from 'plugins/kibana/management/react/store/actions/index-pattern-view';

import {
  getIndexPatternView,
} from 'plugins/kibana/management/react/reducers';

const IndexPatternView = compose(
  connect(
    state => ({ ...getIndexPatternView(state) }),
    { refreshFields, deleteIndexPattern, setDefaultIndexPattern, fetchIndexPattern },
  ),
  wrapWithTabsProps({
    defaults: {
      selectedTab: 'fields',
    },
  }),
  wrapWithProps({
    props: {
      isShowingRefreshFieldsConfirmation: false,
    },
    actions: {
      showRefreshFieldsConfirmation: () => ({ isShowingRefreshFieldsConfirmation: true }),
      hideRefreshFieldsConfirmation: () => ({ isShowingRefreshFieldsConfirmation: false }),
    }
  }),
)(class extends Component {
  componentWillMount() {
    this.props.fetchIndexPattern(this.props.pattern);
  }
  render() {
    return <IndexPatternViewComponent {...this.props}/>;
  }
});

export { IndexPatternView };
