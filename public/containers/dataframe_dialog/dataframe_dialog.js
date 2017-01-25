import React from 'react';
import { connect } from 'react-redux';
import _ from 'lodash';
import Editable from 'plugins/rework/components/editable/editable';
import DataframeSelector from 'plugins/rework/components/dataframe_selector/dataframe_selector';
import DataframeEditor from 'plugins/rework/components/dataframe_editor/dataframe_editor';
import DataframeConnector from 'plugins/rework/components/dataframe_connector/dataframe_connector';
import {dataframeSet, dataframeAdd, dataframeRemove} from 'plugins/rework/state/actions/dataframe';
import './dataframe_dialog.less';

const DataframeDialog = React.createClass({
  getInitialState() {
    const {dataframes} = this.props;
    const dataframeIds = _.keys(dataframes);
    return {
      creating: false,
      renaming: false,
      dataframe: dataframes[dataframeIds[0]]
    };
  }, // This could be initialized with the defaults for the form right?
  selectDataframe(id) {
    const {dataframes} = this.props;
    this.setState(_.assign({}, this.state, {dataframe: dataframes[id]}));
  },
  // Keep this function, accessing state here will cause pass-by-reference issues
  commit(value) {
    const {dispatch, dataframes} = this.props;
    const dataframe = _.cloneDeep(this.state.dataframe);
    const newFrame = Object.assign({}, dataframe, {value});
    this.setState(_.assign({}, this.state, {dataframe: newFrame}));
    dispatch(dataframeSet(newFrame));
  },
  startRename(name) {
    this.setState(_.assign({}, this.state, {renaming: true}));
  },
  finishRename(name) {
    const {dispatch, dataframes} = this.props;
    const {dataframe} = this.state;
    const newFrame = Object.assign({}, dataframe, {name});
    dispatch(dataframeSet(newFrame));
    this.setState(_.assign({}, this.state, {renaming: false}));
  },
  startCreating() {
    this.setState(_.assign({}, this.state, {creating: true}));
  },
  connectDataframe(dataframe) {
    this.props.dispatch(dataframeAdd(dataframe));
    this.setState(_.assign({}, this.state, {creating: false, dataframe: dataframe}));
  },
  removeDataframe(id) {
    return () => this.props.dispatch(dataframeRemove(id));
  },
  render() {
    const {dataframes} = this.props;
    const {creating} = this.state;
    const dataframe = _.cloneDeep(this.state.dataframe);

    const edit = (
      <div>
        <h4>Edit Dataframe
          <small> or <a onClick={this.startCreating}><i className="fa fa-plus-circle"></i> connect a new Dataframe</a></small>
        </h4>
        <div className="rework--dataframe-dropdown-actions">
          {this.state.renaming ?
            (<Editable focus={true} onDone={this.finishRename} value={dataframe.name}></Editable>)
            : (<DataframeSelector dataframes={dataframes} onChange={this.selectDataframe} selected={dataframe.id}></DataframeSelector>)
          }

          <a onClick={this.startRename} className="fa fa-pencil"></a>
          <a onClick={this.removeDataframe(dataframe.id)} className="fa fa-ban"></a>
        </div>

        <DataframeEditor dataframe={dataframe} commit={this.commit}></DataframeEditor>
      </div>
    );

    const create = (
      <div>
        <h4>Connect a new Dataframe</h4>
        <DataframeConnector onConnect={this.connectDataframe}></DataframeConnector>
      </div>
    );

    return (
      <div className="rework--dataframe-dropdown" style={{width: '100%', overflow: 'auto'}}>
        {creating ? create : edit}
      </div>
    );
  }
});

function mapStateToProps(state) {
  return {
    dataframes: state.persistent.dataframes,
  };
}

export default connect(mapStateToProps)(DataframeDialog);
