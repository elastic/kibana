/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import PropTypes from 'prop-types';
import React, { Component } from 'react';
import moment from 'moment';
import { css } from '@emotion/react';
import { EuiToolTip, euiFontSize } from '@elastic/eui';

export const annotationStyle = css`
  position: absolute;
  z-index: 90; // Specific to not overlap chart tooltip
  display: flex;
  flex-direction: column;
  align-items: center;
`;

export const annotationLineStyle = css`
  flex: 1 0 auto;
  width: 2px;
`;

export const annotationIconStyle = ({ euiTheme }) => css`
  flex: 0 0 auto;
  width: ${euiTheme.size.m};
  text-align: center;
`;

export const annotationTooltipStyle = ({ euiTheme }) => css`
  ${euiFontSize({ euiTheme }, 'xs')};
  padding: ${euiTheme.size.s};
  animation-duration: 0s;
  animation-delay: 0s;
`;

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
    const containerCSS = css`
      left: ${offset.left - 6}px;
      bottom: 0;
      top: 5px;
    `;
    const lineCSS = css`
      backgroundcolor: ${color};
    `;
    const iconCSS = css`
      color: ${color};
    `;
    return (
      <div css={[containerCSS, annotationStyle]} className="tvbVisAnnotation">
        <div css={[lineCSS, annotationLineStyle]} className="tvbVisAnnotation__line" />
        <EuiToolTip
          css={annotationTooltipStyle}
          className="tvbVisAnnotation__tooltip"
          content={tooltip}
          position="top"
        >
          <i css={[iconCSS, annotationIconStyle]} className={`tvbVisAnnotation__icon fa ${icon}`} />
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
