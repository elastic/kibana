import PropTypes from 'prop-types';
import React, { Component } from 'react';
import tickFormatter from '../../lib/tick_formatter';
import _ from 'lodash';
import Timeseries from '../../../visualizations/components/timeseries';
import color from 'color';
import replaceVars from '../../lib/replace_vars';
import { getAxisLabelString } from '../../lib/get_axis_label_string';
import { createXaxisFormatter } from '../../lib/create_xaxis_formatter';

function hasSeperateAxis(row) {
  return row.seperate_axis;
}

class TimeseriesVisualization extends Component {

  constructor(props) {
    super(props);
  }

  getInterval = () => {
    const { visData, model } = this.props;
    const series = _.get(visData, `${model.id}.series`, []);
    return series.reduce((currentInterval, item) => {
      if (item.data.length > 1) {
        const seriesInterval = item.data[1][0] - item.data[0][0];
        if (!currentInterval || seriesInterval < currentInterval) return seriesInterval;
      }
      return currentInterval;
    }, 0);
  }

  xaxisFormatter = (val) => {
    const { scaledDataFormat, dateFormat } = this.props.visData;
    if (!scaledDataFormat || !dateFormat) return val;
    const formatter = createXaxisFormatter(this.getInterval(), scaledDataFormat, dateFormat);
    return formatter(val);
  }

  render() {
    const { backgroundColor, model, visData } = this.props;
    const series = _.get(visData, `${model.id}.series`, []);
    let annotations;
    if (model.annotations && Array.isArray(model.annotations)) {
      annotations = model.annotations.map(annotation => {
        const data = _.get(visData, `${model.id}.annotations.${annotation.id}`, [])
          .map(item => [item.key, item.docs]);
        return {
          id: annotation.id,
          color: annotation.color,
          icon: annotation.icon,
          series: data.map(s => {
            return [s[0], s[1].map(doc => {
              return replaceVars(annotation.template, null, doc);
            })];
          })
        };
      });
    }
    const seriesModel = model.series.map(s => _.cloneDeep(s));
    const firstSeries = seriesModel.find(s => s.formatter && !s.seperate_axis);
    const formatter = tickFormatter(_.get(firstSeries, 'formatter'), _.get(firstSeries, 'value_template'));

    const mainAxis = {
      position: model.axis_position,
      tickFormatter: formatter,
      axisFormatter: _.get(firstSeries, 'formatter', 'number'),
      axisFormatterTemplate: _.get(firstSeries, 'value_template')
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
      if (s.stacked !== 'none') {
        series
          .filter(r => _.startsWith(r.id, s.id))
          .forEach(row => {
            row.data = row.data.map(point => {
              if (!point[1]) return [point[0], 0];
              return point;
            });
          });
      }
      if (s.stacked === 'percent') {
        s.seperate_axis = true;
        s.axisFormatter = 'percent';
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

    const interval = this.getInterval();

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
            axisFormatter: row.axis_formatter,
            axisFormatterTemplate: row.value_template
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

    const params = {
      dateFormat: this.props.dateFormat,
      crosshair: true,
      tickFormatter: formatter,
      legendPosition: model.legend_position || 'right',
      series,
      annotations,
      yaxes,
      reversed: this.props.reversed,
      showGrid: Boolean(model.show_grid),
      legend: Boolean(model.show_legend),
      xAxisFormatter: this.xaxisFormatter,
      onBrush: (ranges) => {
        if (this.props.onBrush) this.props.onBrush(ranges);
      }
    };
    if (interval) {
      params.xaxisLabel = getAxisLabelString(interval);
    }
    const style = { };
    const panelBackgroundColor = model.background_color || backgroundColor;
    if (panelBackgroundColor) {
      style.backgroundColor = panelBackgroundColor;
      params.reversed = color(panelBackgroundColor || backgroundColor).luminosity() < 0.45;
    }
    return (
      <div className="dashboard__visualization" style={style}>
        <Timeseries {...params}/>
      </div>
    );

  }

}

TimeseriesVisualization.propTypes = {
  backgroundColor: PropTypes.string,
  className: PropTypes.string,
  model: PropTypes.object,
  onBrush: PropTypes.func,
  onChange: PropTypes.func,
  reversed: PropTypes.bool,
  visData: PropTypes.object,
  dateFormat: PropTypes.string
};

export default TimeseriesVisualization;
