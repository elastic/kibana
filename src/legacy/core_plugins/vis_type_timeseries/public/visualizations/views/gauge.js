/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import _ from 'lodash';
import PropTypes from 'prop-types';
import React, { Component } from 'react';
import classNames from 'classnames';
import { isBackgroundInverted, isBackgroundDark } from '../../../common/set_is_reversed';
import { getLastValue } from '../../../common/get_last_value';
import { getValueBy } from '../lib/get_value_by';
import { GaugeVis } from './gauge_vis';
import reactcss from 'reactcss';
import { calculateCoordinates } from '../lib/calculate_coordinates';

export class Gauge extends Component {
  constructor(props) {
    super(props);
    this.state = {
      scale: 1,
      top: 0,
      left: 0,
      translateX: 1,
      translateY: 1,
    };

    this.handleResize = this.handleResize.bind(this);
  }

  componentWillMount() {
    const check = () => {
      this.timeout = setTimeout(() => {
        const newState = calculateCoordinates(this.inner, this.resize, this.state);
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
    const newState = calculateCoordinates(this.inner, this.resize, this.state);
    this.setState(newState);
  }

  render() {
    const { metric, type } = this.props;
    const { scale, translateX, translateY } = this.state;
    const value = (metric && getLastValue(metric.data)) || 0;
    const max = (metric && getValueBy('max', metric.data)) || 1;
    const formatter =
      (metric && (metric.tickFormatter || metric.formatter)) ||
      this.props.tickFormatter ||
      (v => v);
    const title = (metric && metric.label) || '';
    const styles = reactcss(
      {
        default: {
          inner: {
            top: this.state.top || 0,
            left: this.state.left || 0,
            transform: `matrix(${scale}, 0, 0, ${scale}, ${translateX}, ${translateY})`,
          },
        },
        valueColor: {
          value: {
            color: this.props.valueColor,
          },
        },
      },
      this.props
    );

    const gaugeProps = {
      value,
      reversed: isBackgroundDark(this.props.backgroundColor),
      gaugeLine: this.props.gaugeLine,
      innerLine: this.props.innerLine,
      innerColor: this.props.innerColor,
      max: this.props.max || max,
      color: (metric && metric.color) || '#8ac336',
      type,
    };

    let metrics;
    let additionalLabel;
    if (this.props.additionalLabel) {
      additionalLabel = (
        <div className="tvbVisGauge__additionalLabel">{this.props.additionalLabel}</div>
      );
    }
    if (type === 'half') {
      metrics = (
        <div
          className="tvbVisHalfGauge__metrics"
          ref={el => (this.inner = el)}
          style={styles.inner}
        >
          <div className="tvbVisGauge__label" ref="title">
            {title}
          </div>
          <div className="tvbVisGauge__value" style={styles.value} ref="label">
            {formatter(value)}
          </div>
          {additionalLabel}
        </div>
      );
    } else {
      metrics = (
        <div
          className="tvbVisCircleGauge__metrics"
          ref={el => (this.inner = el)}
          style={styles.inner}
        >
          <div className="tvbVisGauge__value" style={styles.value} ref="label">
            {formatter(value)}
          </div>
          <div className="tvbVisGauge__label" ref="title">
            {title}
          </div>
          {additionalLabel}
        </div>
      );
    }

    const classes = classNames({
      tvbVisHalfGauge: type === 'half',
      tvbVisCircleGauge: type === 'circle',
      'tvbVisGauge--reversed': isBackgroundInverted(this.props.backgroundColor),
    });

    return (
      <div className={classes}>
        <div
          ref={el => (this.resize = el)}
          className={`tvbVisGauge__resize`}
          data-test-subj="tvbVisGaugeContainer"
        >
          {metrics}
          <GaugeVis {...gaugeProps} />
        </div>
      </div>
    );
  }
}

Gauge.defaultProps = {
  type: 'half',
  innerLine: 2,
  gaugeLine: 10,
};

Gauge.propTypes = {
  gaugeLine: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  innerColor: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  innerLine: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  max: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  metric: PropTypes.object,
  backgroundColor: PropTypes.string,
  type: PropTypes.oneOf(['half', 'circle']),
  valueColor: PropTypes.string,
  additionalLabel: PropTypes.string,
};
