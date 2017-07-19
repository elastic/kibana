import _ from 'lodash';
import React, { Component, PropTypes } from 'react';
import getLastValue from '../lib/get_last_value';
import getValueBy from '../lib/get_value_by';
import GaugeVis from './gauge_vis';
import reactcss from 'reactcss';
import calculateCorrdinates from '../lib/calculate_corrdinates';

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

  componentWillMount() {
    const check = () => {
      this.timeout = setTimeout(() => {
        const newState = calculateCorrdinates(this.inner, this.resize, this.state);
        if (newState && this.state && !_.isEqual(newState, this.state)) {
          this.handleResize();
        }
        check();
      }, 500);
    };
    check();
  }

  componentWillUnmount() {
    clearTimeout(this.timeout);
  }

  componentDidMount() {
    this.handleResize();
  }

  handleResize() {
    // Bingo!
    const newState = calculateCorrdinates(this.inner, this.resize, this.state);
    this.setState(newState);
  }

  render() {
    const { metric, type } = this.props;
    const {
      scale,
      translateX,
      translateY
    } = this.state;
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
      },
      valueColor: {
        value: {
          color: this.props.valueColor
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

    let metrics;
    if (type === 'half') {
      metrics = (
        <div
          className="thorHalfGauge__metrics"
          ref={(el) => this.inner = el}
          style={styles.inner}>
          <div
            className="thorHalfGauge__label"
            ref="title">{ title }</div>
          <div
            className="thorHalfGauge__value"
            style={styles.value}
            ref="label">{ formatter(value) }</div>
        </div>
      );
    } else {
      metrics = (
        <div
          className="thorCircleGauge__metrics"
          ref={(el) => this.inner = el}
          style={styles.inner}>
          <div
            className="thorCircleGauge__value"
            style={styles.value}
            ref="label">{ formatter(value) }</div>
          <div
            className="thorCircleGauge__label"
            ref="title">{ title }</div>
        </div>
      );
    }
    let className = type === 'half' ? 'thorHalfGauge' : 'thorCircleGauge';
    if (this.props.reversed) className = `reversed ${className}`;
    return (
      <div className={className}>
        <div
          ref={(el) => this.resize = el}
          className={`${className}__resize`}>
          { metrics }
          <GaugeVis {...gaugeProps}/>
        </div>
      </div>
    );
  }

}

Gauge.defaultProps = {
  type: 'half',
  innerLine: 2,
  gaugeLine: 10
};

Gauge.propTypes = {
  gaugeLine: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  innerColor: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  innerLine: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  max: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  metric: PropTypes.object,
  reversed: PropTypes.bool,
  type: PropTypes.oneOf(['half', 'circle']),
  valueColor: PropTypes.string,
};

export default Gauge;

