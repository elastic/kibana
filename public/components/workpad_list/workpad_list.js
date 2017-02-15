import React from 'react';
import { connect } from 'react-redux';
import _ from 'lodash';
import moment from 'moment';

import Tooltip from 'plugins/rework/components/tooltip/tooltip';
import {
  workdpadLoadAll,
  workpadDelete,
  workpadExport,
  workpadImport,
} from 'plugins/rework/state/actions/workpad';

import './workpad_list.less';

class WorkpadList extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      isExporting: _.get(props, 'workpadExporting', false),
    };
  }

  componentDidMount() {
    this.fetchWorkpads();
  }

  componentWillReceiveProps(nextProps) {
    if (this.state.isExporting && nextProps.workpadExportData) {
      return this.setState({ isExporting: false });
    }

    this.setState({ isExporting: nextProps.workpadExporting });
  }

  fetchWorkpads() {
    this.props.dispatch(workdpadLoadAll());
  }

  importFile() {
    const file = _.get(this.importInput, 'files.0');
    if (file) {
      this.props.dispatch(workpadImport(file));
    }
  }

  handleDelete(id) {
    return () => this.props.dispatch(workpadDelete(id));
  }

  handleSelect(id) {
    return () => this.props.onSelect(id);
  }

  handleImport(files) {
    this.importInput.click();
  }

  render() {
    const { onSelect, workpads } = this.props;
    const isExported = id => {
      const exportId = _.get(this.props, 'workpadExportData.workpad.id');
      return exportId === id;
    };

    const workpadElements = workpads.map(workpad => (
      <tr key={workpad.id} data-id={workpad.id}>
        <td className="rework--workpad-list-name" onClick={this.handleSelect(workpad.id)}>
          {workpad.name}
        </td>
        <td className="rework--workpad-list-timestamp" onClick={this.handleSelect(workpad.id)} style={{textAlign: 'right'}}>
          {moment(workpad.timestamp).fromNow()}
        </td>
        <td className="rework--workpad-list-controls">
          <a onClick={this.handleDelete(workpad.id)} className="fa fa-ban"></a>
          <a href={`${this.props.basePath}/api/rework/export/${workpad.id}`}
            download={`${workpad.name}.json`}
            className="fa fa-download"></a>
        </td>

      </tr>
    ));

    return (
      <div className="rework--workpad-list">
        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th style={{textAlign: 'right'}}>Last Modified</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {workpadElements}
          </tbody>
        </table>

        <div className="rework--workpad-import-export">
          <input style={{display: 'none'}}
            accept="application/json"
            type="file"
            onChange={this.importFile.bind(this)}
            ref={input => this.importInput = input}>
          </input>
          <a onClick={this.handleImport.bind(this)}>Import</a>
          <a href={`${this.props.basePath}/api/rework/export/`} download="workpads.json">Export All</a>
        </div>
      </div>
    );
  }
}

function mapStateToProps(state) {
  return {
    basePath: state.app.basePath,
    workpads: state.transient.workpads,
    workpadState: state.persistent,
    workpadExporting: state.transient.workpadExporting,
    workpadExportData: state.transient.workpadExportData,
  };
}

export default connect(mapStateToProps)(WorkpadList);
