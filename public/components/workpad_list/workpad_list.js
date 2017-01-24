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
    fetch('../api/rework/find?name=', {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'kbn-xsrf': 'turdSandwich',
      }
    })
    .then(resp => resp.json()).then(resp => {
      this.setState(_.assign({}, {workpads: resp.workpads}));
    });
  },
  handleSelect(id) {
    return () => {this.props.onSelect(id);};
  },
  render() {
    const {onSelect, onRemove} = this.props;
    return (
      <div className="rework--workpad-list">
        <table className="table">
          <thead>
            <tr>
              <th>Name</th><th>Last Modified</th>
            </tr>
          </thead>
          <tbody>
            {this.state.workpads.map(workpad => (
              <tr key={workpad.id}>
                <td onClick={this.handleSelect(workpad.id)}>{workpad.name}</td>
                <td onClick={this.handleSelect(workpad.id)}>{moment(workpad.timestamp).fromNow()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }
});
