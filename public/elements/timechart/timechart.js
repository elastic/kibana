import React from 'react';
import _ from 'lodash';
import Element from 'plugins/rework/elements/element';
import elements from 'plugins/rework/elements/elements';
import Dataframe from 'plugins/rework/arg_types/dataframe/lib/dataframe';
import { Timeseries } from '@elastic/thor-visualizations';
import '@elastic/thor-visualizations/css/main.css';
import stylesheet from '!!raw!./timechart.less';
import Warning from 'plugins/rework/components/warning/warning';

import moment from 'moment';
import icon from './icon.svg';
import Arg from 'plugins/rework/arg_types/arg';

elements.push(new Element('timechart', {
  displayName: 'Time Chart',
  icon: icon,
  stylesheet: stylesheet,
  args: [
    new Arg('dataframe', {
      type: 'dataframe',
      default: (state) => _.keys(state.transient.dataframeCache)[0]
    }),
    new Arg('time_column', {
      type: 'dataframe_column',
      default: 'time'
    }),
    new Arg('value_column', {
      type: 'dataframe_column',
      default: 'value'
    }),
    new Arg('group_by', {
      type: 'dataframe_column',
      default: 'label'
    }),
  ],
  template: ({args}) => {

    let groups;
    let dataframe;
    try {
      dataframe = new Dataframe(args.dataframe);
      groups = _.groupBy(dataframe.rows, (row) => row.named[args.group_by].value);
    } catch (e) {
      return (
        <Warning>
          Unable to render chart from dataframe. Check your columns;
        </Warning>
      );
    }


    const series = _.map(groups, (rows, label) => {
      return {
        color: _.get(rows[0].named.color, 'value'),
        stack: true,
        lines: { show: true, lineWidth: 1, fill: 0.5 },
        points: { show: true, lineWidth: 1, radius: 1, fill: 1 },
        label: label,
        data: _.map(rows, (row) => {
          return [moment(row.named[args.time_column].value).valueOf(), row.named[args.value_column].value];
        })
      };
    });

    const props = {
      //crosshair: true,
      //tickFormatter: formatter,
      legendPosition: args.legend_position || 'right',
      series,
      legend: true,
      /*
      onBrush: (ranges) => {
        const link = {
          path: location.path,
          query: _.assign({}, location.query, {
            mode: 'absolute',
            from: moment(ranges.xaxis.from).valueOf(),
            to: moment(ranges.xaxis.to).valueOf()
          })
        };
        dispatch(changeLocation(link));
      }
      */
    };

    return (
      <div className="rework--timechart" id="foobu">
        <Timeseries {...props}></Timeseries>
      </div>
    );
  }
}));
