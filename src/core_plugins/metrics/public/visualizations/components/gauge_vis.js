import _ from 'lodash';
import React, { Component } from 'react';
import $ from '../lib/flot';

class GaugeVis extends Component {

  constructor(props) {
    super(props);
    this.height = props.height || 150;
    this.width = props.width || 150;
    this.opts = {
      series: {
        pie: {
          innerRadius: 0.7,
          show: true,
          startAngle: 1,
        }
      }
    };
  }

  shouldComponentUpdate() {
    if (!this.plot) return true;
    return false;
  }

  componentWillReceiveProps(newProps) {
    if (this.plot) {
      const max = newProps.max || 1;
      this.plot.setData(this.caluclateData(newProps.value / max));
      this.plot.draw();
    }
  }

  componentDidMount() {
    this.renderGauge();
  }

  componentWillUnmount() {
    this.plot.shutdown();
  }

  caluclateData(value) {
    let color = this.props.color || '#8ac336';
    if (this.props.thresholds) {
      if (value > 0.60) color = '#fbce47';
      if (value > 0.80) color = '#d76051';
    }
    return [
      { color: color, data: (value * 0.5) },
      { color: '#DDDDDD', data: 0.5 - (value * 0.5) },
      { color: '#FFFFFF', data: 0.5 }
    ];
  }

  renderGauge() {
    const { target } = this.refs;
    const max = this.props.max || 1;
    const data = this.caluclateData(this.props.value / max);
    $(target).width(this.width).height(this.height);
    this.plot = $.plot(target, data, this.opts);
  }

  render() {
    return (
      <div className="chart" style={{ overflow: 'hidden', height: this.height / 2 }}>
        <div ref="target"/>
      </div>
    );
  }
}

export default GaugeVis;
