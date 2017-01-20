import React from 'react';
import { connect } from 'react-redux';
import ElementTypeList from 'plugins/rework/components/element_type_list';
import _ from 'lodash';

const DataframeDialog = React.createClass({
  render() {
    const {onSelect} = this.props;
    return (
      <ElementTypeList onSelect={onSelect}></ElementTypeList>
    );
  }
});

function mapStateToProps(state) {
  return {
    dataframes: state.persistent.dataframes,
  };
}

export default connect(mapStateToProps)(DataframeDialog);
