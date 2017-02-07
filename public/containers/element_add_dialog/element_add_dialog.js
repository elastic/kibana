import React from 'react';
import { connect } from 'react-redux';
import ElementTypeList from 'plugins/rework/components/element_type_list';
import {elementAddType} from 'plugins/rework/state/actions/element';
import _ from 'lodash';

const DataframeDialog = React.createClass({
  onSelect(type) {
    const {dispatch, pageId} = this.props;
    dispatch(elementAddType(type.name, pageId));
  },
  render() {
    const {onSelect} = this.props;
    return (
      <ElementTypeList onSelect={this.onSelect}></ElementTypeList>
    );
  }
});

function mapStateToProps(state) {
  return {
    dataframes: state.persistent.dataframes,
    pageId: state.persistent.workpad.pages[state.persistent.workpad.page]
  };
}

export default connect(mapStateToProps)(DataframeDialog);
