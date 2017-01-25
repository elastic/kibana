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
    const {selected, dataframes} = this.props;
    return {
      creating: false,
      renaming: false,
      selected: selected || _.keys(dataframes)[0]
    };
  }, // This could be initialized with the defaults for the form right?
  selectDataframe(value) {
    this.setState(_.assign({}, this.state, {selected: value}));
  },
  creating(isCreating) {
    return () => {this.setState(_.assign({}, this.state, {creating: isCreating}));};
  },
  startRename(name) {
    this.setState(_.assign({}, this.state, {renaming: true}));
  },
  finishRename(value) {
    const {dispatch, dataframes} = this.props;
    const {selected} = this.state;
    const dataframe = Object.assign({}, dataframes[selected], {name: value});
    dispatch(dataframeSet(dataframe));
    this.setState(_.assign({}, this.state, {renaming: false}));

  },
  connectDataframe(dataframe) {
    this.props.dispatch(dataframeAdd(dataframe));
    this.setState(_.assign({}, this.state, {creating: false, selected: dataframe.id}));
  },
  removeDataframe(id) {
    return () => this.props.dispatch(dataframeRemove(id));
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
    const {selected, creating} = this.state;
    const dataframe = dataframes[selected];

    const edit = (
      <div>
        <h4>Edit Dataframe <small>or <a onClick={this.creating(true)}>connect a new Dataframe</a></small></h4>
        <div className="rework--dataframe-dropdown-actions">
          {this.state.renaming ?
            (<Editable focus={true} onDone={this.finishRename} value={dataframe.name}></Editable>)
            : (<DataframeSelector dataframes={dataframes} onChange={this.selectDataframe} selected={selected}></DataframeSelector>)
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
