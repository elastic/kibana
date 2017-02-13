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

class DataframeDialog extends React.Component {
  constructor(props) {
    super(props);

    const {dataframes} = this.props;
    const dataframeIds = _.keys(dataframes);
    const selectedId = _.get(props, 'meta.selected', this.getDefaultDataframe());
    const createState = _.get(props, 'meta.creating', false);

    this.state = {
      creating: createState,
      renaming: false,
      dataframe: _.cloneDeep(dataframes[selectedId]),
    };
  }

  componentWillReceiveProps(nextProps) {
    const selectedId = _.get(nextProps, 'meta.selected');
    const createDataframe = _.get(nextProps, 'meta.creating');
    const invalidDataframe = !nextProps.dataframes[this.state.dataframe.id];

    // update creation state if changed
    if (createDataframe) {
      const currentProp = _.get(this.props, 'meta.creating');
      const newCreation = currentProp !== createDataframe;
      if (newCreation) return this.setState({ creating: true });
    }

    // update selected dataframe is prop changed
    if (selectedId) {
      const currentId = this.state.dataframe.id;
      const newSelectedId = currentId !== selectedId;
      if (newSelectedId) {
        this.setState({ creating: false });
        return this.setDataframe(selectedId);
      }
    }

    // update selected dataframe is current one is no longer valid
    if (invalidDataframe) {
      const dataframeIds = _.keys(nextProps.dataframes);
      return this.setDataframe(dataframeIds[0]);
    }
  }

  getDefaultDataframe() {
    const dataframeIds = _.keys(this.props.dataframes);
    return dataframeIds[0];
  }

  getDataframeById(id) {
    const {dataframes} = this.props;
    if (!dataframes[id]) id = _.keys(dataframes)[0];
    return _.cloneDeep(dataframes[id]);
  }

  setDataframe(id) {
    this.setState({ dataframe: this.getDataframeById(id) });
  }

  // Keep this function, accessing state here will cause pass-by-reference issues
  commit(value) {
    const {dispatch, dataframes} = this.props;
    const {dataframe} = this.state;
    const newFrame = _.assign(dataframe, {value});
    this.setState({dataframe: newFrame});
    dispatch(dataframeSet(newFrame));
  }

  startRename(name) {
    this.setState({renaming: true});
  }

  finishRename(name) {
    const {dispatch, dataframes} = this.props;
    const {dataframe} = this.state;
    const newFrame = _.assign(dataframe, {name});
    dispatch(dataframeSet(newFrame));
    this.setState({renaming: false});
  }

  startCreating() {
    this.setState({creating: true});
  }

  connectDataframe(dataframe) {
    this.props.dispatch(dataframeAdd(dataframe));
    this.setState({
      creating: false,
      dataframe: dataframe
    });
  }

  removeDataframe(id) {
    return () => {
      if (_.keys(this.props.dataframes).length < 2) return;
      this.props.dispatch(dataframeRemove(id));
    };
  }

  render() {
    const {dataframes} = this.props;
    const {creating} = this.state;
    const dataframe = _.cloneDeep(this.state.dataframe);

    const deleteClasses = _.keys(dataframes).length < 2 ? ['rework--no-action'] : [];

    const DataframeEditOrSelect = ((() => {
      if (this.state.renaming) {
        return (
          <Editable focus={true} onDone={this.finishRename.bind(this)} value={dataframe.name}></Editable>
        );
      }

      return (
        <DataframeSelector dataframes={dataframes} onChange={this.setDataframe.bind(this)}
          selected={dataframe.id}></DataframeSelector>
      );
    })());

    const edit = (
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

    const create = (
      <div>
        <h4>Connect a new Dataframe</h4>
        <DataframeConnector onConnect={this.connectDataframe.bind(this)}></DataframeConnector>
      </div>
    );

    return (
      <div className="rework--dataframe-dropdown" style={{width: '100%', overflow: 'auto'}}>
        {creating ? create : edit}
      </div>
    );
  }
}

function mapStateToProps(state) {
  return {
    dataframes: state.persistent.dataframes,
  };
}

export default connect(mapStateToProps)(DataframeDialog);
