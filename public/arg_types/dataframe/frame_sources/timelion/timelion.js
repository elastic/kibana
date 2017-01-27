import React from 'react';
import _ from 'lodash';
import FrameSource from 'plugins/rework/arg_types/dataframe/frame_sources/frame_source';
import frameSources from 'plugins/rework/arg_types/dataframe/frame_sources/frame_sources';

import TimelionInterval from 'plugins/rework/arg_types/dataframe/frame_sources/timelion/timelion_interval';
import TimelionExpression from 'plugins/rework/arg_types/dataframe/frame_sources/timelion/timelion_expression';
import fetch from 'isomorphic-fetch';
import moment from 'moment';
import './timelion.less';

//import TimelionExpression from './timelion_expression';

frameSources.push(new FrameSource('timelion', {
  displayName: 'Timelion',
  help: 'Use timelion expressions to fetch data from Elasticsearch and other sources',
  defaults: {
    expression: '.es()',
    interval: 'auto'
  },
  toDataframe: function (value, filters) {
    const dataframe =   {
      type: 'dataframe',
      columns: [{name: 'foo', type: 'string'}],
      rows: []
    };

    const timeFilters = _.filter(filters, {type: 'time'});
    if (timeFilters.length !== 1) throw new Error('Timelion must have 1 and only 1 time filter');

    const body = {
      sheet: [value.expression],
      time: {
        from: timeFilters[0].value.from,
        to: timeFilters[0].value.to,
        interval: value.interval,
        timezone: 'America/Phoenix'
      }
    };

    const timelionResp =  fetch('../api/timelion/run', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'kbn-xsrf': 'turdSandwich',
      },
      body: JSON.stringify(body)
    })
    .then(resp => resp.json());

    return timelionResp.then(resp => {
      const seriesList = resp.sheet[0];

      const columns = [
        {name: 'label', type: 'string'},
        {name: 'time', type: 'string'},
        {name: 'value', type: 'number'},
        {name: 'color', type: 'string'}
      ];

      const rows = [].concat.apply([], _.map(seriesList.list, series => {
        const color = series.color;
        return _.map(series.data, point => {
          return {
            label: series.label,
            time: moment(point[0]).format(),
            color: color,
            value: point[1]
          };
        });
      }));

      return {columns: columns, rows: rows};
    });

  },
  form: React.createClass({
    getInitialState() {
      return {expression: this.props.value.expression, interval: this.props.value.interval};
    },
    change(prop) {
      return (value) => {
        this.setState({[prop]: value});
      };
    },
    run() {
      this.props.commit(this.state);
    },
    render() {
      const {expression, interval} = this.state;
      return (
        <div className="rework--timelion">
          <form onSubmit={this.run}>

            <label>Expression</label>
            <form className="rework--timelion--input" onSubmit={this.run}>
              <TimelionExpression onChange={this.change('expression')} expression={expression}></TimelionExpression>
              <TimelionInterval onChange={this.change('interval')} interval={interval}></TimelionInterval>
              <button className="btn rework--timelion--submit" type="submit" onClick={this.run}><i className="fa fa-play"></i></button>
            </form>
          </form>
        </div>
      );
    }
  })
}));
