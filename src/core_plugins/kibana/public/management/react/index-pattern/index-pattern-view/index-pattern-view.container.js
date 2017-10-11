import React, { Component } from 'react';
import { connect } from 'react-redux';
import { IndexPatternView as IndexPatternViewComponent } from './index-pattern-view.component';

import {
  CustomProps
} from 'plugins/kibana/management/react/lib/custom_props';

import {
  TabProps
} from 'plugins/kibana/management/react/lib/tab_props';

import {
  refreshFields,
  deleteIndexPattern,
  setDefaultIndexPattern,
  fetchIndexPattern,
} from 'plugins/kibana/management/react/store/actions';

import {
  getSelectedIndexId,
  getSelectedIndexFields,
  getSelectedIndexTimeFieldName,
  getSelectedIndexIsDefault,
} from 'plugins/kibana/management/react/store/reducers';

const IndexPatternView = connect(
  state => ({
    id: getSelectedIndexId(state),
    fields: getSelectedIndexFields(state),
    timeFieldName: getSelectedIndexTimeFieldName(state),
    isDefault: getSelectedIndexIsDefault(state),
  }),
  { refreshFields, deleteIndexPattern, setDefaultIndexPattern, fetchIndexPattern },
)(class extends Component {
  componentWillMount() {
    this.props.fetchIndexPattern(this.props.pattern);
  }
  render() {
    return (
      <TabProps
        selectedTab="fields"
        render={(tabProps) => (
          <CustomProps
            props={{ isShowingRefreshFieldsConfirmation: false }}
            actions={{
              showRefreshFieldsConfirmation: () => ({ isShowingRefreshFieldsConfirmation: true }),
              hideRefreshFieldsConfirmation: () => ({ isShowingRefreshFieldsConfirmation: false }),
            }}
            render={(customProps) => (
              <IndexPatternViewComponent
                {...customProps}
                {...tabProps}
                {...this.props}
              />
            )}
          />
        )}
      />
    );
  }
});

export { IndexPatternView };
