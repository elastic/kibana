import React from 'react';
import _ from 'lodash';
import { connect } from 'react-redux';
import DataframeSelector from 'plugins/rework/components/dataframe_selector/dataframe_selector';

const LinkFrame = React.createClass({
  render() {
    const {dataframes, select, value} = this.props;
    return (
      <DataframeSelector
        onChange={select}
        dataframes={dataframes}
        selected={value}>
      </DataframeSelector>
    );
  }
});

function mapStateToProps(state) {
  return {
    dataframes: state.persistent.dataframes
  };
}

export default connect(mapStateToProps)(LinkFrame);
