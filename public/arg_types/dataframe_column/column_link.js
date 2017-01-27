import React from 'react';
import _ from 'lodash';
import { connect } from 'react-redux';
import DataframeColumnSelector from 'plugins/rework/components/dataframe_column_selector/dataframe_column_selector';

const LinkFrame = React.createClass({
  render() {
    const {dataframeCache, dataframeId, onChange, value} = this.props;
    return (
      <DataframeColumnSelector
        onChange={onChange}
        dataframe={dataframeCache[dataframeId]}
        value={value}>
      </DataframeColumnSelector>
    );
  }
});

function mapStateToProps(state) {
  return {
    dataframeCache: state.transient.dataframeCache
  };
}

export default connect(mapStateToProps)(LinkFrame);
