import _ from 'lodash';
import numeral from 'numeral';
import React, { Component } from 'react';
import $ from './flot';
import getLastValue from './get_last_value';
import GaugeVis from './gauge_vis';

class Gauge extends Component {

  constructor(props) {
    super(props);
    this.height = props.height || 150;
    this.width = props.width || 150;
  }

  formatValue(value) {
    const format = this.props.format || '0.00%';
    if (_.isFunction(format)) {
      return format(value);
    }
    return numeral(value).format(format);
  }

  render() {
    const value = getLastValue(this.props.metric.data);
    const titleFontSize = this.height * 0.3;
    const labelFontSize = this.height * 0.3;
    const gaugeProps = {
      value,
      max: this.props.max || 1,
      height: this.height,
      width: this.width,
      thresholds: this.props.thresholds != null ? this.props.thresholds : true,
      color: this.props.color || '#8ac336'
    };
    return (
      <div className="gauge" ref="gauge">
        <div
          className="title"
          style={{ fontSize: titleFontSize }}
          ref="title">{ this.props.title }</div>
        <GaugeVis {...gaugeProps}/>
        <div
          className="label"
          style={{ fontSize: labelFontSize }}
          ref="label">{ this.formatValue(value) }</div>
      </div>
    );
  }

}

export default Gauge;
