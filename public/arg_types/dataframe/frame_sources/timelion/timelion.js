import React from 'react';
import _ from 'lodash';
import FrameSource from 'plugins/rework/arg_types/dataframe/frame_sources/frame_source';
import frameSources from 'plugins/rework/arg_types/dataframe/frame_sources/frame_sources';
import Dataframe from 'plugins/rework/arg_types/dataframe/lib/dataframe';

import TimelionInterval from 'plugins/rework/arg_types/dataframe/frame_sources/timelion/timelion_interval';
import TimelionExpression from 'plugins/rework/arg_types/dataframe/frame_sources/timelion/timelion_expression';
import fetch from 'isomorphic-fetch';
import moment from 'moment';
import './timelion.less';
import {exactly} from './filters/exactly';

//import TimelionExpression from './timelion_expression';

frameSources.push(new FrameSource('timelion', {
  displayName: 'Timelion',
  help: 'Use timelion expressions to fetch data from Elasticsearch and other sources',
  defaults: {
    expression: '.es()',
    interval: 'auto'
  },
  toDataframe: function (value, filters) {
    const filterHandlers = {
      exactly: exactly
    };

    const dataframe =   {
      type: 'dataframe',
      columns: [{name: 'foo', type: 'string'}],
      rows: []
    };

    const timeFilters = _.filter(filters, {type: 'time'});
    if (timeFilters.length !== 1) throw new Error('Timelion must have 1 and only 1 time filter');

    // We need to inject other filters here
    const body = {
      sheet: [value.expression],
      time: {
        from: timeFilters[0].value.from,
        to: timeFilters[0].value.to,
        interval: value.interval,
        timezone: 'America/Phoenix'
      }
    };

    const otherFilters = _.reject(filters, {type: 'time'});
    const boolQuery = {bool: {}};
    _.each(otherFilters, filter => {
      if (!filterHandlers[filter.type]) return;
      boolQuery.bool.must = boolQuery.bool.must || [];
      boolQuery.bool.must.push(filterHandlers[filter.type](filter.value));
    });

    if (boolQuery.bool.must) {
      body.extended = {
        es: {
          filter: boolQuery
        }
      };
    }

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

      return new Dataframe({columns: columns, rows: rows, schema: 'timeseries', keys: ['label']});
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
    run(e) {
      e.preventDefault();
      this.props.commit(this.state);
    },
    render() {
      const {expression, interval} = this.state;
      return (
        <div className="rework--timelion">
          <form onSubmit={this.run}>
            <label>Expression</label>
            <div className="rework--timelion--input">
              <TimelionExpression onChange={this.change('expression')} expression={expression}></TimelionExpression>
              <TimelionInterval onChange={this.change('interval')} interval={interval}></TimelionInterval>
              <button className="btn rework--timelion--submit" type="submit"><i className="fa fa-play"></i></button>
            </div>
          </form>
        </div>
      );
    }
  })
}));
