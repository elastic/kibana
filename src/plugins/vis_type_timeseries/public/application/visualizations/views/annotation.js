/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import PropTypes from 'prop-types';
import React, { Component } from 'react';
import moment from 'moment';
import reactcss from 'reactcss';
import { EuiToolTip } from '@elastic/eui';

export class Annotation extends Component {
  constructor(props) {
    super(props);
  }

  renderTooltip() {
    const [timestamp, messageSource] = this.props.series;
    const messages = messageSource.map((message, i) => {
      return (
        <div key={`${message}-${i}`} className="tvbVisAnnotation__message">
          {message}
        </div>
      );
    });
    return (
      <div>
        <div className="tvbTooltip__timestamp">{moment(timestamp).format('lll')}</div>
        {messages}
      </div>
    );
  }

  render() {
    const { color, plot, icon, series } = this.props;
    const offset = plot.pointOffset({ x: series[0], y: 0 });
    const tooltip = this.renderTooltip();
    const style = reactcss({
      default: {
        container: {
          left: offset.left - 6,
          bottom: 0,
          top: 5,
        },
        line: {
          backgroundColor: color,
        },
        icon: { color },
      },
    });
    return (
      <div className="tvbVisAnnotation" style={style.container}>
        <div className="tvbVisAnnotation__line" style={style.line} />
        <EuiToolTip className="tvbVisAnnotation__tooltip" content={tooltip} position="top">
          <i className={`tvbVisAnnotation__icon fa ${icon}`} style={style.icon} />
        </EuiToolTip>
      </div>
    );
  }
}

Annotation.propTypes = {
  series: PropTypes.array,
  icon: PropTypes.string,
  color: PropTypes.string,
  plot: PropTypes.object,
};
