import React from 'react';
import { connect } from 'react-redux';
import _ from 'lodash';
import DataframeSelector from 'plugins/rework/components/dataframe_selector/dataframe_selector';
import DataframeEditor from 'plugins/rework/components/dataframe_editor/dataframe_editor';
import {dataframeSet} from 'plugins/rework/state/actions/dataframe';

const DataframeDropdown = React.createClass({
  getInitialState() {
    const {selected, dataframes} = this.props;
    return {selected: selected || _.keys(dataframes)[0]};
  }, // This could be initialized with the defaults for the form right?
  selectDataframe(value) {
    this.setState(_.assign({}, this.state, {selected: value}));
  },
  commit(value) {
    // So this is the place we need to dispatch the event to resolve the frame
    const {dispatch, dataframes} = this.props;
    const {selected} = this.state;
    const dataframe = Object.assign({}, dataframes[selected], {value});
    dispatch(dataframeSet(dataframe));
  },
  render() {
    const {dataframes} = this.props;
    const {selected} = this.state;
    const dataframe = dataframes[selected];

    return (
      <div className="rework--dataframe-dropdown" style={{width: '100%', overflow: 'auto'}}>
        <label>Edit Dataframe</label>
        <DataframeSelector dataframes={dataframes} onChange={this.selectDataframe} selected={selected}></DataframeSelector>
        <DataframeEditor dataframe={dataframe} commit={this.commit}></DataframeEditor>
      </div>
    );
  }
});

function mapStateToProps(state) {
  return {
    dataframes: state.persistent.dataframes,
  };
}

export default connect(mapStateToProps)(DataframeDropdown);
