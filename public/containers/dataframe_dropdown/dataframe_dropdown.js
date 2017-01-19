import React from 'react';
import { connect } from 'react-redux';
import _ from 'lodash';
import DataframeSelector from 'plugins/rework/components/dataframe_selector/dataframe_selector';
import DataframeEditor from 'plugins/rework/components/dataframe_editor/dataframe_editor';

const DataframeDropdown = React.createClass({
  getInitialState() {
    const {selected, dataframes} = this.props;
    return {selected: selected || _.keys(dataframes)[0]};
  }, // This could be initialized with the defaults for the form right?
  selectDataframe(value) {
    this.setState(_.assign({}, this.state, {selected: value}));
  },
  commit(value) {
    console.log(value);
  },
  render() {
    const {dataframes} = this.props;
    const {selected} = this.state;

    return (
      <div className="rework--dataframe-dropdown" style={{width: '100%', overflow: 'auto'}}>
        <DataframeSelector dataframes={dataframes} onChange={this.selectDataframe} selected={selected}></DataframeSelector>
        <DataframeEditor dataframe={dataframes[selected]} commit={this.commit}></DataframeEditor>
      </div>
    );
  }
});

function mapStateToProps(state) {
  return {
    dataframes: state.persistent.storage.dataframes,
  };
}

export default connect(mapStateToProps)(DataframeDropdown);
