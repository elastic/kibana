import _ from 'lodash';
import numeral from 'numeral';
import React, { Component, PropTypes } from 'react';
import $ from '../lib/flot';
import getLastValue from '../lib/get_last_value';
import getValueBy from '../lib/get_value_by';
import ResizeAware from 'simianhacker-react-resize-aware';
import GaugeVis from './gauge_vis';
import { findDOMNode } from 'react-dom';
import reactcss from 'reactcss';

class Gauge extends Component {

  constructor(props) {
    super(props);
    this.state = {
      scale: 1,
      top: 0,
      left: 0,
      translateX: 1,
      translateY: 1
    };

    this.handleResize = this.handleResize.bind(this);
  }

  calculateCorrdinates() {
    const inner = findDOMNode(this.refs.inner);
    const resize = findDOMNode(this.refs.resize);
    let scale = this.state.scale;

    if (!inner || !resize) return;

    // Let's start by scaling to the largest dimension
    if (resize.clientWidth - resize.clientHeight < 0) {
      scale = resize.clientWidth / inner.clientWidth;
    } else {
      scale = resize.clientHeight / inner.clientHeight;
    }
    let [ newWidth, newHeight ] = this.calcDimensions(inner, scale);

    // Now we need to check to see if it will still fit
    if (newWidth > resize.clientWidth) {
      scale = resize.clientWidth / inner.clientWidth;
    }
    if (newHeight > resize.clientHeight) {
      scale = resize.clientHeight / inner.clientHeight;
    }

    // Calculate the final dimensions
    [ newWidth, newHeight ] = this.calcDimensions(inner, scale);

    // Because scale is middle out we need to translate
    // the new X,Y corrdinates
    const translateX = (newWidth - inner.clientWidth) / 2;
    const translateY = (newHeight - inner.clientHeight) / 2;

    // Center up and down
    const top = Math.floor((resize.clientHeight - newHeight) / 2);
    const left = Math.floor((resize.clientWidth - newWidth) / 2);

    return { scale, top, left, translateY, translateX };
  }

  componentDidMount() {
    const resize = findDOMNode(this.refs.resize);
    if (!resize) return;
    resize.addEventListener('resize', this.handleResize);
    this.handleResize();
  }

  componentWillUnmount() {
    const resize = findDOMNode(this.refs.resize);
    if (!resize) return;
    resize.removeEventListener('resize', this.handleResize);
  }

  // When the component updates it might need to be resized so we need to
  // recalculate the corrdinates and only update if things changed a little. THis
  // happens when the number is too wide or you add a new series.
  componentDidUpdate() {
    const newState = this.calculateCorrdinates();
    if (newState && !_.isEqual(newState, this.state)) {
      this.setState(newState);
    }
  }

  calcDimensions(el, scale) {
    const newWidth = Math.floor(el.clientWidth * scale);
    const newHeight = Math.floor(el.clientHeight * scale);
    return [newWidth, newHeight];
  }

  handleResize() {
    // Bingo!
    const newState = this.calculateCorrdinates();
    newState && this.setState(newState);
  }

  render() {
    const { metric, type } = this.props;
    const { scale, translateX, translateY, top, left } = this.state;
    const value = metric && getLastValue(metric.data, 5) || 0;
    const max = metric && getValueBy('max', metric.data) || 1;
    const formatter = (metric && (metric.tickFormatter || metric.formatter)) ||
      this.props.tickFormatter || ((v) => v);
    const title = metric && metric.label || '';
    const styles = reactcss({
      default: {
        inner: {
          top: this.state.top || 0,
          left: this.state.left || 0,
          transform: `matrix(${scale}, 0, 0, ${scale}, ${translateX}, ${translateY})`
        }
      }
    }, this.props);

    const gaugeProps = {
      reversed: this.props.reversed,
      value,
      gaugeLine: this.props.gaugeLine,
      innerLine: this.props.innerLine,
      innerColor: this.props.innerColor,
      max: this.props.max || max,
      color: metric && metric.color || '#8ac336',
      type
    };
    const valueStyle = {};
    if (this.props.valueColor) {
      valueStyle.color = this.props.valueColor;
    }

    let metrics;
    if (metric) {
      if (type === 'half') {
        metrics = (
          <div
            className="thorHalfGauge__metrics"
            ref="inner"
            style={styles.inner}>
            <div
              className="thorHalfGauge__label"
              ref="title">{ title }</div>
            <div
              className="thorHalfGauge__value"
              style={valueStyle}
              ref="label">{ formatter(value) }</div>
          </div>
        );
      } else {
        metrics = (
          <div
            className="thorCircleGauge__metrics"
            ref="inner"
            style={styles.inner}>
            <div
              className="thorCircleGauge__value"
              style={valueStyle}
              ref="label">{ formatter(value) }</div>
            <div
              className="thorCircleGauge__label"
              ref="title">{ title }</div>
          </div>
        );
      }
    }
    let className = type === 'half' ? 'thorHalfGauge' : 'thorCircleGauge';
    if (this.props.reversed) className = `reversed ${className}`;
    return (
      <div className={className}>
        <ResizeAware className={`${className}__resize`} ref="resize">
          { metrics }
          <GaugeVis {...gaugeProps}/>
        </ResizeAware>
      </div>
    );
  }

}

Gauge.defaultProps = {
  type      : 'half',
  innerLine : 2,
  gaugeLine : 10
};

Gauge.propTypes = {
  gaugeLine  : PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  innerColor : PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  innerLine  : PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  max        : PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  metric     : PropTypes.object,
  reversed   : PropTypes.bool,
  type       : PropTypes.oneOf(['half', 'circle']),
  valueColor : PropTypes.string,
};

export default Gauge;

