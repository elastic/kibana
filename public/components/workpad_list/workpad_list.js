import React from 'react';
import _ from 'lodash';
import fetch from 'isomorphic-fetch';
import moment from 'moment';
import './workpad_list.less';

export default React.createClass({
  getInitialState() {
    return {workpads: []};
  }, // This could be initialized with the defaults for the form right?
  componentDidMount() {
    this.fetchWorkpads();
  },
  fetchWorkpads() {
    fetch('../api/rework/find?name=', {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'kbn-xsrf': 'turdSandwich',
      }
    })
    .then(resp => resp.json()).then(resp => {
      this.setState({workpads: resp.workpads});
    });
  },
  handleDelete(id) {
    return () => {
      fetch('../api/rework/delete/' + id, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'kbn-xsrf': 'turdSandwich',
        }
      })
      .then(resp => resp.json()).then(resp => {
        this.fetchWorkpads();
      });
    };
  },
  handleSelect(id) {
    return () => {this.props.onSelect(id);};
  },
  render() {
    const {onSelect} = this.props;
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
            {this.state.workpads.map(workpad => (
              <tr key={workpad.id}>
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
});
