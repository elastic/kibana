/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import PropTypes from 'prop-types';
import React, { Component } from 'react';
import _ from 'lodash';
import { EuiResizeObserver } from '@elastic/eui';
import reactcss from 'reactcss';

import { getLastValue } from '../../../../common/last_value_utils';
import { calculateCoordinates } from '../lib/calculate_coordinates';

export class Metric extends Component {
  constructor(props) {
    super(props);
    this.state = {
      scale: 1,
      left: 0,
      top: 0,
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
    const { metric, secondary } = this.props;
    const { scale, translateX, translateY } = this.state;
    const primaryFormatter = (metric && (metric.tickFormatter || metric.formatter)) || ((n) => n);
    const primaryValue = primaryFormatter(getLastValue(metric?.data));

    const styles = reactcss(
      {
        default: {
          container: {},
          inner: {
            top: this.state.top || 0,
            left: this.state.left || 0,
            transform: `matrix(${scale}, 0, 0, ${scale}, ${translateX}, ${translateY})`,
          },
          primary_value: {},
          secondary_value: {},
        },
        reversed: {
          primary_value: {},
          secondary_value: {},
        },
      },
      this.props
    );

    if (this.props.backgroundColor) styles.container.backgroundColor = this.props.backgroundColor;
    if (metric && metric.color) styles.primary_value.color = metric.color;

    let primaryLabel;
    if (metric && metric.label) {
      primaryLabel = <div className="tvbVisMetric__label--primary">{metric.label}</div>;
    }

    let secondarySnippet;
    if (secondary) {
      const secondaryFormatter = secondary.formatter || ((n) => n);
      const secondaryValue = secondaryFormatter(getLastValue(secondary.data));
      if (secondary.color) styles.secondary_value.color = secondary.color;
      let secondaryLabel;
      if (secondary.label) {
        secondaryLabel = <div className="tvbVisMetric__label--secondary">{secondary.label}</div>;
      }
      secondarySnippet = (
        <div className="tvbVisMetric__secondary">
          {secondaryLabel}
          <div style={styles.secondary_value} className="tvbVisMetric__value--secondary">
            {/* eslint-disable-next-line react/no-danger */}
            <span dangerouslySetInnerHTML={{ __html: secondaryValue }} />
          </div>
        </div>
      );
    }

    let additionalLabel;
    if (this.props.additionalLabel) {
      additionalLabel = (
        <div className="tvbVisMetric__label--additional">{this.props.additionalLabel}</div>
      );
    }

    let className = 'tvbVisMetric';
    if (!styles.container.backgroundColor) {
      className += ' tvbVisMetric--noBackground';
    }
    if (this.props.reversed) {
      className += ' tvbVisMetric--reversed';
    }
    return (
      <EuiResizeObserver onResize={this.checkResizeThrottled}>
        {(resizeRef) => (
          <div className={className} ref={resizeRef} style={styles.container}>
            <div ref={(el) => (this.resize = el)} className="tvbVisMetric__resize">
              <div
                ref={(el) => (this.inner = el)}
                className="tvbVisMetric__inner"
                style={styles.inner}
              >
                <div className="tvbVisMetric__primary">
                  {primaryLabel}
                  <div
                    style={styles.primary_value}
                    data-test-subj="tsvbMetricValue"
                    className="tvbVisMetric__value--primary"
                  >
                    {/* eslint-disable-next-line react/no-danger */}
                    <span dangerouslySetInnerHTML={{ __html: primaryValue }} />
                  </div>
                </div>
                {secondarySnippet}
                {additionalLabel}
              </div>
            </div>
          </div>
        )}
      </EuiResizeObserver>
    );
  }
}

Metric.propTypes = {
  backgroundColor: PropTypes.string,
  metric: PropTypes.object,
  secondary: PropTypes.object,
  reversed: PropTypes.bool,
  additionalLabel: PropTypes.string,
};
