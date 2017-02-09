import React from 'react';
import _ from 'lodash';
import {parse} from './parse';
import FrameSource from 'plugins/rework/arg_types/dataframe/frame_sources/frame_source';
import frameSources from 'plugins/rework/arg_types/dataframe/frame_sources/frame_sources';
import Dataframe from 'plugins/rework/arg_types/dataframe/lib/dataframe';
import {exactly} from './filters/exactly';
import './csv.less';

frameSources.push(new FrameSource('csv', {
  displayName: 'CSV',
  help: 'Import a CSV',
  defaults: {
    csv:'"make","model","year","price"\n' +
        '"Subaru","Impreza","2015",17695\n' +
        '"Subaru","Impreza","2016",18020\n' +
        '"Subaru","Impreza","2017",18245\n' +
        '"Subaru","Baja","2015",21995\n' +
        '"Subaru","Baja","2016",21995\n' +
        '"Subaru","Baja","2017",22345\n' +
        '"Subaru","Outback","2015",23245\n' +
        '"Subaru","Outback","2016",23470\n' +
        '"Subaru","Outback","2017",24445\n'
  },
  toDataframe: function (value, filters) {
    const filterHandlers = {
      exactly: exactly
    };

    const dataframe =   {
      type: 'dataframe',
      columns: [],
      rows: []
    };

    if (!value || value.length === 0) return dataframe;

    let parsedArrays;
    try {
      parsedArrays = parse(value.csv);
    } catch (e) {
      return;
    }

    const keys = parsedArrays.shift();
    if (!keys.length || !parsedArrays.length) return dataframe;

    dataframe.rows = _.map(parsedArrays, (values) => _.zipObject(keys, values));

    _.each(filters, filter => {
      const fn = filterHandlers[filter.type];
      if (!fn) return;
      dataframe.rows = fn(filter.value, dataframe.rows);
    });

    dataframe.columns = _.map(keys, (key) => {
      return {
        name: key,
        type: typeof dataframe.rows[0][key]
      };
    });

    return new Dataframe(dataframe);
  },
  // You can write JSX here.
  // If you need more state you should create a component to handle it.
  // Make sure to call commit('someProperty') to tell reframe you have a saveable change.
  // Simply use onChange={commit('someProperty')} as your default. Think of it as ng-model, sort of.
  // The data will go "up" using commit, and come back down on the value attribute.
  form: React.createClass({
    typing(e) {
      const {commit} = this.props;
      const value = {csv: e.target.value};
      commit(value);
    },
    render() {
      const {csv} = this.props.value;
      return (
        <div className="rework--csv">
          <div className="rework--csv--character-count">Length: {_.get(csv, 'length')}</div>
          <textarea className="form-control" rows="10" onChange={this.typing} value={csv}></textarea>
        </div>
      );
    }
  })
}));
