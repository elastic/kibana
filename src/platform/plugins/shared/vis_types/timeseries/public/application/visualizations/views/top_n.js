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
import { css } from '@emotion/react';

import { getLastValue, isEmptyValue } from '../../../../common/last_value_utils';
import { getValueOrEmpty } from '../../../../common/empty_label';
import { RenderCounter } from '../../components/render_counter';

import { getVisVariables } from './_variables';

const topNContainerStyle = ({ euiTheme }) => css`
  position: relative;
  overflow: auto;
  display: flex;
  flex-direction: column;

  tr:hover td {
    background-color: ${getVisVariables({ euiTheme }).tvbHoverBackgroundColor};
  }
`;

const topNValueStyle = ({ euiTheme }) => css`
  text-align: right;
  white-space: nowrap;
  line-height: 0;
  vertical-align: middle;
  color: ${getVisVariables({ euiTheme }).tvbValueColor};
  padding: ${euiTheme.size.xs};
  padding-bottom: 0;
`;

const topNLabelStyle = ({ euiTheme }) => css`
  color: ${getVisVariables({ euiTheme }).tvbTextColor};
  padding: ${euiTheme.size.xs} 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const topNBarStyle = ({ euiTheme }) => css`
  padding: ${euiTheme.size.xs} ${euiTheme.size.m};
  vertical-align: middle;
`;

const topNInnerBarStyle = ({ euiTheme }) => css`
  position: relative;

  > div {
    width: 100%;
    min-height: ${euiTheme.size.base};
  }
`;

const topNReversedStyles = ({ euiTheme }) => {
  const { tvbHoverBackgroundColorReversed, tvbTextColorReversed, tvbValueColorReversed } =
    getVisVariables({ euiTheme });

  return css`
    tr:hover td {
      background-color: ${tvbHoverBackgroundColorReversed};
    }

    .tvbVisTopN__label {
      color: ${tvbTextColorReversed};
    }

    .tvbVisTopN__value {
      color: ${tvbValueColorReversed};
    }
  `;
};

const RENDER_MODES = {
  POSITIVE: 'positive',
  NEGATIVE: 'negative',
  MIXED: 'mixed',
};

export class TopN extends Component {
  constructor(props) {
    super(props);

    this.tableRef = React.createRef();
    this.state = {
      labelMaxWidth: 150,
    };
  }

  get labelMaxWidth() {
    // calculate max-width of a label column as 35% of the table
    return this.tableRef.current.offsetWidth * 0.35;
  }

  componentDidMount() {
    this.setState({
      labelMaxWidth: this.labelMaxWidth,
    });
  }

  componentDidUpdate(prevProps, prevState) {
    if (prevState.labelMaxWidth !== this.labelMaxWidth) {
      this.setState({
        labelMaxWidth: this.labelMaxWidth,
      });
    }
  }

  handleClick(item) {
    return () => {
      if (this.props.onClick) {
        this.props.onClick(item);
      }
    };
  }

  static getRenderMode = (min, max) => {
    if (min >= 0) {
      return RENDER_MODES.POSITIVE;
    } else if (max < 0) {
      return RENDER_MODES.NEGATIVE;
    }
    return RENDER_MODES.MIXED;
  };

  static calcInnerBarStyles = (renderMode, isPositive) => {
    if (renderMode === RENDER_MODES.MIXED) {
      return {
        [isPositive ? 'marginLeft' : 'marginRight']: '50%',
      };
    }
    return {};
  };

  static calcInnerBarDivStyles = (item, widthWithUnit, isPositive) => {
    return {
      backgroundColor: item.color,
      width: widthWithUnit,
      float: isPositive ? 'left' : 'right',
    };
  };

  static calcDomain = (renderMode, min, max) => {
    if (renderMode === RENDER_MODES.MIXED) {
      return Math.max(max, Math.abs(min));
    } else if (renderMode === RENDER_MODES.NEGATIVE) {
      return Math.abs(min);
    }

    return max;
  };

  renderRow({ min, max }) {
    return (item) => {
      const renderMode = TopN.getRenderMode(min, max);
      const key = `${item.id || item.label}`;
      const lastValue = getLastValue(item.data);
      const lastValueFormatted = isEmptyValue(lastValue) ? 0 : lastValue;
      const formatter = item.tickFormatter || this.props.tickFormatter;
      const isPositiveValue = lastValueFormatted >= 0;

      const intervalLength = TopN.calcDomain(renderMode, min, max);
      // if both are 0, the division returns NaN causing unexpected behavior.
      // For this it defaults to 0
      const width = 100 * (Math.abs(lastValueFormatted) / intervalLength) || 0;
      const widthWithUnit = isEmptyValue(lastValue) ? '1px' : `${width}%`;
      const label = item.label;

      return (
        <tr
          key={key}
          onClick={this.handleClick({ lastValue, ...item })}
          style={typeof this.props.onClick === 'function' ? { cursor: 'pointer' } : {}}
        >
          <td
            title={item.label}
            className="tvbVisTopN__label"
            css={topNLabelStyle}
            style={{ maxWidth: `${this.state.labelMaxWidth}px` }}
          >
            {getValueOrEmpty(label)}
          </td>
          <td width="100%" className="tvbVisTopN__bar" css={topNBarStyle}>
            <div
              className="tvbVisTopN__innerBar"
              css={topNInnerBarStyle}
              style={TopN.calcInnerBarStyles(renderMode, isPositiveValue)}
            >
              <div
                style={TopN.calcInnerBarDivStyles(item, widthWithUnit, isPositiveValue)}
                data-test-subj="topNInnerBar"
              />
            </div>
          </td>
          <td className="tvbVisTopN__value" css={topNValueStyle} data-test-subj="tsvbTopNValue">
            {/* eslint-disable-next-line react/no-danger */}
            <span dangerouslySetInnerHTML={{ __html: formatter(lastValue) }} />
          </td>
        </tr>
      );
    };
  }

  render() {
    if (!this.props.series) return null;

    const intervalSettings = this.props.series.reduce(
      (acc, series, index) => {
        const value = getLastValue(series.data) ?? 0;

        return {
          min: !index || value < acc.min ? value : acc.min,
          max: !index || value > acc.max ? value : acc.max,
        };
      },
      { min: undefined, max: undefined }
    );

    const rows = this.props.series.map(this.renderRow(intervalSettings));
    let className = 'tvbVisTopN';
    if (this.props.reversed) {
      className += ' tvbVisTopN--reversed';
    }

    return (
      <RenderCounter initialRender={this.props.initialRender}>
        <div
          className={className}
          css={[topNContainerStyle, this.props.reversed && topNReversedStyles]}
        >
          <table className="tvbVisTopN__table" data-test-subj="tvbVisTopNTable" ref={this.tableRef}>
            <tbody>{rows}</tbody>
          </table>
        </div>
      </RenderCounter>
    );
  }
}

TopN.defaultProps = {
  tickFormatter: (n) => n,
  direction: 'desc',
};

TopN.propTypes = {
  tickFormatter: PropTypes.func,
  onClick: PropTypes.func,
  series: PropTypes.array,
  reversed: PropTypes.bool,
  direction: PropTypes.string,
};
