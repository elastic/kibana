import _ from 'lodash';
import numeral from 'numeral';
import React, { Component } from 'react';
import $ from './flot';
import getLastValue from './get_last_value';

class Sparkline extends Component {

  constructor(props) {
    super(props);
    const max = props.max;
    const min = props.min;
    this.height = props.height || 75;
    this.width = props.width || 150;
    this.opts = {
      legend: { show: false },
      xaxis: {
        timezone: 'browser',
        mode: 'time',
        show: false
      },
      yaxis: { show: false },
      series: {
        shadowSize: 0,
        lines: {
          lineWidth: props.line ? 1 : 0, fill: props.line ? 0.0 : 1.0,
          show: true
        }
      },
      grid: {
        backgroundColor: '#EEEEEE',
        borderWidth: 0
      }
    };

    if (props.max) _.set(this.opts, 'yaxis.max', props.max);
    if (props.min) _.set(this.opts, 'yaxis.min', props.min);
  }

  componentWillUnmount() {
    this.plot.shutdown();
  }

  shouldComponentUpdate() {
    if (!this.plot) return true;
    return false;
  }

  componentWillReceiveProps(newProps) {
    if (this.plot) {
      const { metrics } = newProps;
      this.plot.setData(this.calculateData(metrics));
      this.plot.setupGrid();
      this.plot.draw();
    }
  }

  componentDidMount() {
    this.renderChart();
  }

  calculateData(data) {
    const last = getLastValue(data);
    const dataPoint = {
      color: this.props.color || '#6eadc1',
      data,
      lines: {}
    };
    if (this.props.thresholds) {
      dataPoint.color = '#d76051';
      dataPoint.threshold = [
        { below: 0.60, color: '#8ac336'},
        { below: 0.80, color: '#fbce47' }
      ];
    }
    return [dataPoint];
  }

  renderChart() {
    const { target} = this.refs;
    const { metrics} = this.props;
    const data = this.calculateData(metrics);
    $(target).width(this.width).height(this.height);
    this.plot = $.plot(target, data, this.opts);
  }

  render() {
    return (<div className="sparkline" ref="target"/>);
  }

}

export default Sparkline;
