import React from 'react';
import _ from 'lodash';
import {parse} from './parse';
import FrameSource from 'plugins/rework/arg_types/dataframe/frame_sources/frame_source';
import frameSources from 'plugins/rework/arg_types/dataframe/frame_sources/frame_sources';

frameSources.push(new FrameSource('csv', {
  displayName: 'CSV',
  help: 'Import a CSV',
  defaults: {
    csv:  '"model","segment","price"\n' +
          '"crosstrek","SUV",21000\n' +
          '"impreza","sedan",16000\n' +
          '"outback","SUV",25000\n'
  },
  toDataframe: function (value) {
    const dataframe =   {
      type: 'dataframe',
      columns: [],
      rows: []
    };

    const parsedArrays = parse(value.csv);

    const keys = parsedArrays.shift();
    dataframe.rows = _.map(parsedArrays, (values) => _.zipObject(keys, values));
    dataframe.columns = _.map(keys, (key) => {
      return {
        name: key,
        type: typeof dataframe.rows[0][key]
      };
    });

    return dataframe;
  },
  // You can write JSX here.
  // If you need more state you should create a component to handle it.
  // Make sure to call commit('someProperty') to tell reframe you have a saveable change.
  // Simply use onChange={commit('someProperty')} as your default. Think of it as ng-model, sort of.
  // The data will go "up" using commit, and come back down on the value attribute.
  form: React.createClass({
    getInitialState() {
      return {csv: this.props.value.csv};
    },
    typing(e) {
      const {commit} = this.props;
      const value = {csv: e.target.value};
      this.setState(_.assign({}, this.state, value));
      commit(value);
    },
    render() {
      const {csv} = this.state;
      return (
        <div className="reframe--csv">
          <div className="reframe--csv--character-count">Length: {_.get(csv, 'length')}</div>
          <textarea className="form-control" rows="10" onChange={this.typing} value={csv}></textarea>
        </div>
      );
    }
  })
}));
