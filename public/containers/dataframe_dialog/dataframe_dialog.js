import React from 'react';
import { connect } from 'react-redux';
import _ from 'lodash';
import Tooltip from 'plugins/rework/components/tooltip/tooltip';
import Editable from 'plugins/rework/components/editable/editable';
import DataframeSelector from 'plugins/rework/components/dataframe_selector/dataframe_selector';
import DataframeEditor from 'plugins/rework/components/dataframe_editor/dataframe_editor';
import DataframeConnector from 'plugins/rework/components/dataframe_connector/dataframe_connector';
import {
  dataframeCreate,
  dataframeSelect,
  dataframeSet,
  dataframeAdd,
  dataframeRemove
} from 'plugins/rework/state/actions/dataframe';
import './dataframe_dialog.less';

class DataframeDialog extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      renaming: false,
    };
  }

  getDefaultDataframe() {
    const dataframeIds = _.keys(this.props.dataframes);
    return _.get(this.props, 'selectedId') || dataframeIds[0];
  }

  getDataframeById(id, props = this.props) {
    const {dataframes} = props;
    if (!dataframes[id]) id = _.keys(dataframes)[0];
    return _.cloneDeep(dataframes[id]);
  }

  setDataframe(id, props) {
    const dataframe = this.getDataframeById(id, props);
    this.props.dispatch(dataframeSelect(dataframe.id));
  }

  // Keep this function, accessing state here will cause pass-by-reference issues
  commit(value) {
    const {dispatch, dataframes} = this.props;
    const dataframe = this.getDataframeById(this.props.selectedId);
    const newFrame = _.assign({}, dataframe, {value});
    dispatch(dataframeSet(newFrame));
  }

  startRename(name) {
    this.setState({renaming: true});
  }

  finishRename(name) {
    const {dispatch, dataframes} = this.props;
    const dataframe = this.getDataframeById(this.props.selectedId);
    const newFrame = _.assign({}, dataframe, {name});
    this.setState({renaming: false});
    dispatch(dataframeSet(newFrame));
  }

  startCreating() {
    this.props.dispatch(dataframeCreate(true));
  }

  connectDataframe(dataframe) {
    this.props.dispatch(dataframeCreate(false));
    this.props.dispatch(dataframeAdd(dataframe));
    this.props.dispatch(dataframeSelect(dataframe.id));
  }

  removeDataframe(id) {
    const { dispatch, dataframes, selectedId } = this.props;
    return () => {
      if (_.keys(dataframes).length < 2) return;
      dispatch(dataframeRemove(id));
      if (selectedId === id) {
        this.setDataframe();
      }
    };
  }

  renderEdit() {
    const { dataframes } = this.props;
    const dataframe = this.getDataframeById(this.props.selectedId);
    const deleteClasses = _.keys(dataframes).length < 2 ? ['rework--no-action'] : [];

    const DataframeEditOrSelect = (this.state.renaming) ? (
      <Editable
        focus={true}
        onDone={this.finishRename.bind(this)}
        value={dataframe.name}>
      </Editable>
    ) : (
      <DataframeSelector
        dataframes={dataframes}
        onChange={this.setDataframe.bind(this)}
        selected={dataframe.id}>
      </DataframeSelector>
    );

    return (
      <div>
        <h4>Edit Dataframe
          <small> or <a onClick={this.startCreating.bind(this)}><i className="fa fa-plus-circle"></i> connect a new Dataframe</a></small>
        </h4>
        <div className="rework--dataframe-dropdown-actions">
          {DataframeEditOrSelect}

          <Tooltip place="left" content="Rename"><a onClick={this.startRename.bind(this)} className="fa fa-pencil"></a></Tooltip>
          <Tooltip place="left" content="Delete frame and all linked elements">
            <a onClick={this.removeDataframe(dataframe.id)} className={['fa fa-ban', ...deleteClasses].join(' ')}></a>
          </Tooltip>
        </div>

        <DataframeEditor key={dataframe.id} dataframe={dataframe} commit={this.commit.bind(this)}></DataframeEditor>
      </div>
    );
  }

  renderCreate() {
    return (
      <div>
        <h4>Connect a new Dataframe</h4>
        <DataframeConnector onConnect={this.connectDataframe.bind(this)}></DataframeConnector>
      </div>
    );
  }

  render() {
    const {dataframes, isCreating} = this.props;

    return (
      <div className="rework--dataframe-dropdown" style={{width: '100%', overflow: 'auto'}}>
        {isCreating ? this.renderCreate() : this.renderEdit()}
      </div>
    );
  }
}

function mapStateToProps(state) {
  return {
    dataframes: state.persistent.dataframes,
    selectedId: state.transient.dataframeSelectedId,
    isCreating: state.transient.dataframeIsCreating,
  };
}

export default connect(mapStateToProps)(DataframeDialog);
