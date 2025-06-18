/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import _ from 'lodash';
import PropTypes from 'prop-types';
import React, { Component } from 'react';
import { EuiResizeObserver, euiTextTruncate } from '@elastic/eui';
import { css } from '@emotion/react';
import classNames from 'classnames';
import { isBackgroundInverted, isBackgroundDark } from '../../lib/set_is_reversed';
import { getLastValue } from '../../../../common/last_value_utils';
import { getValueBy } from '../lib/get_value_by';
import { GaugeVis } from './gauge_vis';
import { calculateCoordinates } from '../lib/calculate_coordinates';
import { getVisVariables } from './_variables';

/**
 * 1. Text is scaled using a matrix so all font sizes and related metrics
 *    are being calcuated from a percentage of the base font size of 100% (14px).
 */

const containerStyle = css`
  font-size: 100%; /* 1 */
  display: flex;
  flex-direction: column;
  flex: 1 0 auto;
`;

const metricsBaseStyle = ({ euiTheme }) => css`
  position: absolute;
  width: 100px;
  height: 100px;
  text-align: center;
  padding: ${euiTheme.size.s};
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
`;

const halfMetricsStyle = ({ euiTheme }) => css`
  height: 70px;
  padding: 0 ${euiTheme.size.m} ${euiTheme.size.s};
  justify-content: flex-end;
`;

const labelStyle = ({ euiTheme }) => css`
  color: ${getVisVariables({ euiTheme }).tvbTextColor};
  font-size: 0.5em; /* 1 */
  line-height: 1em; /* 1 */
  text-align: center;
  padding: 0 ${euiTheme.size.s} ${euiTheme.size.xs};

  .tvbVisGauge--reversed & {
    color: ${getVisVariables({ euiTheme }).tvbTextColorReversed};
  }
`;

const valueStyle = ({ euiTheme }) => css`
  color: ${getVisVariables({ euiTheme }).tvbValueColor};
  font-size: 0.9em; /* 1 */
  line-height: 1em; /* 1 */
  text-align: center;
  /* make gauge value the target for pointer-events */
  pointer-events: all;

  .tvbVisGauge--reversed & {
    color: ${getVisVariables({ euiTheme }).tvbValueColorReversed};
  }
`;

const additionalLabelStyle = ({ euiTheme }) => css`
  font-size: 0.4em; /* 1 */
  line-height: 1.2em; /* 1 */
  width: 100%;
  padding: 2px ${euiTheme.size.xs};
  color: ${getVisVariables({ euiTheme }).tvbValueColor};

  .tvbVisGauge--reversed & {
    color: ${getVisVariables({ euiTheme }).tvbValueColorReversed};
  }
`;

const resizeStyle = css`
  position: relative;
  display: flex;
  flex-direction: column;
  flex: 1 0 auto;
  /* disable gauge container pointer-events as it shouldn't be event target */
  pointer-events: none;
`;

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
  handledResize = false;

  componentWillUnmount() {
    clearTimeout(this.timeout);
  }

  componentDidMount() {
    this.handleResize(true);
  }

  handleResize() {
    // Bingo!
    const newState = calculateCoordinates(this.inner, this.resize, this.state);
    this.setState(newState);
    this.handledResize = true;
  }

  render() {
    const { metric, type, initialRender } = this.props;
    const { scale, translateX, translateY } = this.state;
    const value = getLastValue(metric?.data);
    const max = (metric && getValueBy('max', metric.data)) || 1;
    const formatter =
      (metric && (metric.tickFormatter || metric.formatter)) ||
      this.props.tickFormatter ||
      ((v) => v);
    const title = (metric && metric.label) || '';
    const innerCSS = css`
      top: ${this.state.top || 0}px;
      left: ${this.state.left || 0}px;
      transform: matrix(${scale}, 0, 0, ${scale}, ${translateX}, ${translateY});
      z-index: 1;
    `;
    const gaugeProps = {
      value,
      reversed: isBackgroundDark(this.props.backgroundColor),
      gaugeLine: this.props.gaugeLine,
      innerLine: this.props.innerLine,
      innerColor: this.props.innerColor,
      max: this.props.max || max,
      color: (metric && metric.color) || '#8ac336',
      type,
      initialRender,
    };

    let metrics;
    let additionalLabel;
    if (this.props.additionalLabel) {
      additionalLabel = (
        <div
          className="tvbVisGauge__additionalLabel"
          css={[euiTextTruncate(), additionalLabelStyle]}
        >
          {this.props.additionalLabel}
        </div>
      );
    }
    if (type === 'half') {
      metrics = (
        <div
          css={[innerCSS, metricsBaseStyle, halfMetricsStyle]}
          className="tvbVisHalfGauge__metrics"
          ref={(el) => (this.inner = el)}
        >
          <div
            className="tvbVisGauge__label"
            css={labelStyle}
            ref="title"
            data-test-subj="gaugeLabel"
          >
            {title}
          </div>
          <div
            className="tvbVisGauge__value"
            css={valueStyle}
            style={this.props.valueColor ? { color: this.props.valueColor } : {}}
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
          css={[innerCSS, metricsBaseStyle]}
          className="tvbVisCircleGauge__metrics"
          ref={(el) => (this.inner = el)}
        >
          <div
            className="tvbVisGauge__value"
            style={this.props.valueColor ? { color: this.props.valueColor } : {}}
            ref="label"
            data-test-subj="gaugeValue"
          >
            {/* eslint-disable-next-line react/no-danger */}
            <span dangerouslySetInnerHTML={{ __html: formatter(value) }} />
          </div>
          <div
            className="tvbVisGauge__label"
            css={labelStyle}
            ref="title"
            data-test-subj="gaugeLabel"
          >
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
          <div className={classes} css={[containerStyle]} ref={resizeRef}>
            <div
              ref={(el) => (this.resize = el)}
              className={`tvbVisGauge__resize`}
              css={resizeStyle}
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
