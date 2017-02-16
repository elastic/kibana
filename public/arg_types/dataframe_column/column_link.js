import React from 'react';
import _ from 'lodash';
import { connect } from 'react-redux';
import Loading from 'plugins/rework/components/loading/loading';
import DataframeColumnSelector from 'plugins/rework/components/dataframe_column_selector/dataframe_column_selector';
import Promise from 'bluebird';

class ColumnLink extends React.PureComponent {
  constructor(props) {
    super(props);
    this.state = {};
    props.dataframeCache[props.dataframeId].then((value) => {
      this.setState({dataframe: value});
    });
  }

  componentWillReceiveProps(nextProps) {
    nextProps.dataframeCache[nextProps.dataframeId].then((value) => {
      this.setState({dataframe: value});
    });
  }

  render() {
    const {dataframeCache, dataframeId, onChange, value} = this.props;
    if (!this.state.dataframe) return (<Loading/>);
    return (
      <DataframeColumnSelector
        onChange={onChange}
        dataframe={this.state.dataframe}
        value={value}>
      </DataframeColumnSelector>
    );
  }
};

function mapStateToProps(state) {
  return {
    dataframeCache: state.transient.dataframeCache
  };
}

export default connect(mapStateToProps)(ColumnLink);
