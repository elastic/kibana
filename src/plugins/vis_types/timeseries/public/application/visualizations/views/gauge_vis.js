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
import { calculateCoordinates } from '../lib/calculate_coordinates';
import { COLORS } from '../constants/chart';
import { isEmptyValue } from '../../../../common/last_value_utils';

export class GaugeVis extends Component {
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
    const { type, value, max, color } = this.props;

    // if value is empty array, no metrics to display.
    const formattedValue = isEmptyValue(value) ? 1 : value;

    const { scale, translateX, translateY } = this.state;
    const size = 2 * Math.PI * 50;
    const sliceSize = type === 'half' ? 0.6 : 1;
    const percent = formattedValue < max ? formattedValue / max : 1;
    const styles = reactcss(
      {
        default: {
          resize: {
            position: 'relative',
            display: 'flex',
            rowDirection: 'column',
            flex: '1 0 auto',
            overflow: 'hidden', // Fixes IE scrollbars issue
          },
          svg: {
            position: 'absolute',
            top: this.state.top,
            left: this.state.left,
            transform: `matrix(${scale}, 0, 0, ${scale}, ${translateX}, ${translateY})`,
          },
          innerLine: {
            strokeWidth: this.props.innerLine,
          },
          gaugeLine: {
            strokeWidth: this.props.gaugeLine,
          },
        },
        half: {
          svg: {
            transform: `matrix(${scale}, 0, 0, ${scale}, ${translateX}, ${translateY})`,
          },
        },
      },
      { half: type === 'half' }
    );

    const props = {
      circle: {
        r: 50,
        cx: 60,
        cy: 60,
        fill: 'rgba(0,0,0,0)',
        stroke: color,
        strokeWidth: this.props.gaugeLine,
        strokeDasharray: `${percent * sliceSize * size} ${size}`,
        transform: 'rotate(-90 60 60)',
      },
      circleBackground: {
        r: 50,
        cx: 60,
        cy: 60,
        fill: 'rgba(0,0,0,0)',
        stroke: COLORS.LINE_COLOR,
        strokeDasharray: `${sliceSize * size} ${size}`,
        strokeWidth: this.props.innerLine,
      },
    };

    if (type === 'half') {
      props.circle.transform = 'rotate(-197.8 60 60)';
      props.circleBackground.transform = 'rotate(162 60 60)';
    }

    if (this.props.innerColor) {
      props.circleBackground.stroke = this.props.innerColor;
    }

    let svg;
    if (type === 'half') {
      svg = (
        <svg width={120.72} height={78.72}>
          <circle
            {...props.circleBackground}
            style={styles.innerLine}
            data-test-subj="gaugeCircleInner"
          />
          <circle {...props.circle} style={styles.gaugeLine} data-test-subj="gaugeCircle" />
        </svg>
      );
    } else {
      svg = (
        <svg width={120.72} height={120.72}>
          <circle {...props.circleBackground} data-test-subj="gaugeCircleInner" />
          <circle {...props.circle} data-test-subj="gaugeCircle" />
        </svg>
      );
    }
    return (
      <EuiResizeObserver onResize={this.checkResizeThrottled}>
        {(resizeRef) => (
          <div
            ref={(el) => {
              this.resize = el;
              resizeRef(el);
            }}
            style={styles.resize}
          >
            <div style={styles.svg} ref={(el) => (this.inner = el)}>
              {svg}
            </div>
          </div>
        )}
      </EuiResizeObserver>
    );
  }
}

GaugeVis.defaultProps = {
  innerLine: 2,
  gaugeLine: 10,
};

GaugeVis.propTypes = {
  color: PropTypes.string,
  gaugeLine: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  innerColor: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  innerLine: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  max: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  metric: PropTypes.object,
  reversed: PropTypes.bool,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number, PropTypes.array]),
  type: PropTypes.oneOf(['half', 'circle']),
};
