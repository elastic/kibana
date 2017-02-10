import React from 'react';
import { connect } from 'react-redux';
import _ from 'lodash';
import moment from 'moment';

import { workdpadLoadAll, workpadDelete } from 'plugins/rework/state/actions/workpad';
import './workpad_list.less';

class WorkpadList extends React.Component {
  componentDidMount() {
    this.fetchWorkpads();
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

  render() {
    const { onSelect, workpads } = this.props;
    return (
      <div className="rework--workpad-list">
        <table className="table">
          <thead>
            <tr>
              <th width="1px"></th>
              <th>Name</th>
              <th style={{textAlign: 'right'}}>Last Modified</th>
            </tr>
          </thead>
          <tbody>
            {workpads.map(workpad => (
              <tr key={workpad.id} data-id={workpad.id}>
                <td>
                  <i onClick={this.handleDelete(workpad.id)} className="fa fa-ban rework--workpad-list-delete"></i>
                </td>
                <td className="rework--workpad-list-name" onClick={this.handleSelect(workpad.id)}>
                  {workpad.name}
                </td>
                <td className="rework--workpad-list-timestamp" onClick={this.handleSelect(workpad.id)} style={{textAlign: 'right'}}>
                  {moment(workpad.timestamp).fromNow()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }
}

function mapStateToProps(state) {
  return {
    workpads: state.transient.workpads,
  };
}

export default connect(mapStateToProps)(WorkpadList);
