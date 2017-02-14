import React from 'react';
import { connect } from 'react-redux';
import _ from 'lodash';
import moment from 'moment';

import Tooltip from 'plugins/rework/components/tooltip/tooltip';
import { workdpadLoadAll, workpadDelete, workpadExport } from 'plugins/rework/state/actions/workpad';
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

  handleDelete(id) {
    return () => this.props.dispatch(workpadDelete(id));
  }

  handleSelect(id) {
    return () => this.props.onSelect(id);
  }

  handleExport(id) {
    return () => this.props.dispatch(workpadExport(id));
  }

  renderExport(workpad) {
    return (
      <a onClick={this.handleExport(workpad.id)} className="fa fa-download"></a>
    );
  }

  renderDownload() {
    try {
      const { workpadExportData } = this.props;
      const json = JSON.stringify(workpadExportData, null, 2);
      const fileBlob = new Blob([json], { type: 'application/json' });
      const url = window.URL || window.webkitURL;
      const exportBlob = url.createObjectURL(fileBlob);

      return (
        <a className="fa fa-save"
          href={exportBlob}
          download={`${workpadExportData.workpad.name}.json`}>
        </a>
      );
    } catch (e) {
      // TODO: better error handling
      console.log('export failed', e);
      return (
        <Tooltip content="Export Failed">
          <i className="fa fa-times"></i>
        </Tooltip>
      );
    }
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
          { isExported(workpad.id) ? this.renderDownload() : this.renderExport(workpad) }
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
      </div>
    );
  }
}

function mapStateToProps(state) {
  return {
    workpads: state.transient.workpads,
    workpadState: state.persistent,
    workpadExporting: state.transient.workpadExporting,
    workpadExportData: state.transient.workpadExportData,
  };
}

export default connect(mapStateToProps)(WorkpadList);
