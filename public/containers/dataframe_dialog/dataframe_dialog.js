import React from 'react';
import { connect } from 'react-redux';
import _ from 'lodash';
import Tooltip from 'plugins/rework/components/tooltip/tooltip';
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
      dataframe: _.cloneDeep(dataframes[dataframeIds[0]])
    };
  },
  componentWillReceiveProps(nextProps) {
    const dataframeIds = _.keys(nextProps.dataframes);

    if (!nextProps.dataframes[this.state.dataframe.id]) {
      this.setState({dataframe: _.cloneDeep(nextProps.dataframes[dataframeIds[0]])});
    }
  },
  selectDataframe(id) {
    const {dataframes} = this.props;
    this.setState({dataframe: _.cloneDeep(dataframes[id])});
  },
  // Keep this function, accessing state here will cause pass-by-reference issues
  commit(value) {
    const {dispatch, dataframes} = this.props;
    const {dataframe} = this.state;
    const newFrame = _.assign(dataframe, {value});
    this.setState({dataframe: newFrame});
    dispatch(dataframeSet(newFrame));
  },
  startRename(name) {
    this.setState({renaming: true});
  },
  finishRename(name) {
    const {dispatch, dataframes} = this.props;
    const {dataframe} = this.state;
    const newFrame = _.assign(dataframe, {name});
    dispatch(dataframeSet(newFrame));
    this.setState({renaming: false});
  },
  startCreating() {
    this.setState({creating: true});
  },
  connectDataframe(dataframe) {
    this.props.dispatch(dataframeAdd(dataframe));
    this.setState({creating: false, dataframe: dataframe});
  },
  removeDataframe(id) {
    return () => {
      if (_.keys(this.props.dataframes).length < 2) return;
      this.props.dispatch(dataframeRemove(id));
    };
  },
  render() {
    const {dataframes} = this.props;
    const {creating} = this.state;
    const dataframe = _.cloneDeep(this.state.dataframe);

    const deleteClasses = _.keys(dataframes).length < 2 ? ['rework--no-action'] : [];

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

          <Tooltip place="left" content="Rename"><a onClick={this.startRename} className="fa fa-pencil"></a></Tooltip>
          <Tooltip place="left" content="Delete frame and all linked elements">
            <a onClick={this.removeDataframe(dataframe.id)} className={['fa fa-ban', ...deleteClasses].join(' ')}></a>
          </Tooltip>
        </div>

        <DataframeEditor key={dataframe.id} dataframe={dataframe} commit={this.commit}></DataframeEditor>
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
