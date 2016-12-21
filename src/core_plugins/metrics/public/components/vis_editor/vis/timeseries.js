import tickFormatter from '../../../lib/tick_formatter';
import moment from 'moment';
import _ from 'lodash';
import { Timeseries } from '../../../visualizations/lib';
import React from 'react';
import color from 'color';

function hasSeperateAxis(row) {
  return row.seperate_axis;
}

const formatLookup = {
  'bytes': '0.0b',
  'number': '0,0.[00]',
  'percent': '0.[00]%'
};

export default React.createClass({
  render() {
    const { backgroundColor, model, visData } = this.props;
    const series = _.get(visData, `${model.id}.series`, []);
    const seriesModel = model.series.map(s => _.cloneDeep(s));
    const firstSeries = seriesModel.find(s => s.formatter && !s.seperate_axis);
    const formatter = tickFormatter(_.get(firstSeries, 'formatter'), _.get(firstSeries, 'value_template'));

    const mainAxis = {
      position: model.axis_position,
      tickFormatter: formatter,
      axis_formatter: _.get(firstSeries, 'formatter', 'number'),
    };

    if (model.axis_min) mainAxis.min = model.axis_min;
    if (model.axis_max) mainAxis.max = model.axis_max;

    const yaxes = [mainAxis];


    seriesModel.forEach(s => {
      series
        .filter(r => _.startsWith(r.id, s.id))
        .forEach(r => r.tickFormatter = tickFormatter(s.formatter, s.value_template));

      if (s.hide_in_legend) {
        series
          .filter(r => _.startsWith(r.id, s.id))
          .forEach(r => delete r.label);
      }
      if (s.stacked === 'percent') {
        s.seperate_axis = true;
        s.axis_formatter = 'percent';
        s.axis_min = 0;
        s.axis_max = 1;
        s.axis_position = model.axis_position;
        const seriesData = series.filter(r => _.startsWith(r.id, s.id));
        const first = seriesData[0];
        if (first) {
          first.data.forEach((row, index) => {
            const rowSum = seriesData.reduce((acc, item) => {
              return item.data[index][1] + acc;
            }, 0);
            seriesData.forEach(item => {
              item.data[index][1] = rowSum && item.data[index][1] / rowSum || 0;
            });
          });
        }
      }
    });


    let axisCount = 1;
    if (seriesModel.some(hasSeperateAxis)) {
      seriesModel.forEach((row) => {
        if (row.seperate_axis) {
          axisCount++;

          const formatter = tickFormatter(row.formatter, row.value_template);

          const yaxis = {
            alignTicksWithAxis: 1,
            position: row.axis_position,
            tickFormatter: formatter,
            axis_formatter: row.axis_formatter
          };

          if (row.axis_min != null) yaxis.min = row.axis_min;
          if (row.axis_max != null) yaxis.max = row.axis_max;

          yaxes.push(yaxis);

          // Assign axis and formatter to each series
          series
            .filter(r => _.startsWith(r.id, row.id))
            .forEach(r => {
              r.yaxis = axisCount;
            });
        }
      });
    }

    const props = {
      crosshair: true,
      tickFormatter: formatter,
      legendPosition: model.legend_position || 'right',
      series,
      yaxes,
      legend: Boolean(model.show_legend),
      onBrush: (ranges) => {
        // const link = {
        //   path: location.path,
        //   query: _.assign({}, location.query, {
        //     mode: 'absolute',
        //     from: moment(ranges.xaxis.from).valueOf(),
        //     to: moment(ranges.xaxis.to).valueOf()
        //   })
        // };
        // dispatch(changeLocation(link));
      }
    };
    const style = { };
    const panelBackgroundColor = model.background_color || backgroundColor;
    if (panelBackgroundColor) {
      style.backgroundColor = panelBackgroundColor;
      props.reversed = color(panelBackgroundColor).luminosity() < 0.45;
    }
    return (
      <div className="dashboard__visualization" style={style}>
        <Timeseries {...props}/>
      </div>
    );
  }
});
