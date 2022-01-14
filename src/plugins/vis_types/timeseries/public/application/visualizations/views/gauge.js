/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import _ from 'lodash';
import PropTypes from 'prop-types';
import React, { Component } from 'react';
import { EuiResizeObserver } from '@elastic/eui';
import classNames from 'classnames';
import { isBackgroundInverted, isBackgroundDark } from '../../lib/set_is_reversed';
import { getLastValue } from '../../../../common/last_value_utils';
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
    this.checkResizeThrottled = _.throttle(() => {
      const newState = calculateCoordinates(this.inner, this.resize, this.state);
      if (newState && this.state && !_.isEqual(newState, this.state)) {
        this.handleResize();
      }
    }, 200);
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
    const value = getLastValue(metric?.data);
    const max = (metric && getValueBy('max', metric.data)) || 1;
    const formatter =
      (metric && (metric.tickFormatter || metric.formatter)) ||
      this.props.tickFormatter ||
      ((v) => v);
    const title = (metric && metric.label) || '';
    const styles = reactcss(
      {
        default: {
          inner: {
            top: this.state.top || 0,
            left: this.state.left || 0,
            transform: `matrix(${scale}, 0, 0, ${scale}, ${translateX}, ${translateY})`,
            zIndex: 1,
          },
          valueColor: {
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
          ref={(el) => (this.inner = el)}
          style={styles.inner}
        >
          <div className="tvbVisGauge__label" ref="title" data-test-subj="gaugeLabel">
            {title}
          </div>
          <div
            className="tvbVisGauge__value"
            style={styles.valueColor}
            ref="label"
            data-test-subj="gaugeValue"
          >
            {/* eslint-disable-next-line react/no-danger */}
            <span dangerouslySetInnerHTML={{ __html: formatter(value) }} />
          </div>
          {additionalLabel}
        </div>
      );
    } else {
      metrics = (
        <div
          className="tvbVisCircleGauge__metrics"
          ref={(el) => (this.inner = el)}
          style={styles.inner}
        >
          <div
            className="tvbVisGauge__value"
            style={styles.valueColor}
            ref="label"
            data-test-subj="gaugeValue"
          >
            {/* eslint-disable-next-line react/no-danger */}
            <span dangerouslySetInnerHTML={{ __html: formatter(value) }} />
          </div>
          <div className="tvbVisGauge__label" ref="title" data-test-subj="gaugeLabel">
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
      <EuiResizeObserver onResize={this.checkResizeThrottled}>
        {(resizeRef) => (
          <div className={classes} ref={resizeRef}>
            <div
              ref={(el) => (this.resize = el)}
              className={`tvbVisGauge__resize`}
              data-test-subj="tvbVisGaugeContainer"
            >
              {metrics}
              <GaugeVis {...gaugeProps} />
            </div>
          </div>
        )}
      </EuiResizeObserver>
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
