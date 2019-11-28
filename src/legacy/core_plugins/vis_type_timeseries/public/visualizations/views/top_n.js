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

import PropTypes from 'prop-types';
import React, { Component } from 'react';
import { getLastValue } from '../../../common/get_last_value';
import reactcss from 'reactcss';

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

  static calcInnerBarDivStyles = (item, width, isPositive) => {
    return {
      backgroundColor: item.color,
      width: width + '%',
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
    return item => {
      const renderMode = TopN.getRenderMode(min, max);
      const key = `${item.id || item.label}`;
      const lastValue = getLastValue(item.data);
      const formatter = item.tickFormatter || this.props.tickFormatter;
      const isPositiveValue = lastValue >= 0;

      const intervalLength = TopN.calcDomain(renderMode, min, max);
      const width = 100 * (Math.abs(lastValue) / intervalLength);

      const styles = reactcss(
        {
          default: {
            innerBar: {
              ...TopN.calcInnerBarStyles(renderMode, isPositiveValue),
            },
            innerBarValue: {
              ...TopN.calcInnerBarDivStyles(item, width, isPositiveValue),
            },
            label: {
              maxWidth: this.state.labelMaxWidth,
            },
          },
          onClick: {
            row: {
              cursor: 'pointer',
            },
          },
        },
        this.props
      );
      return (
        <tr key={key} onClick={this.handleClick({ lastValue, ...item })} style={styles.row}>
          <td title={item.label} className="tvbVisTopN__label" style={styles.label}>
            {item.label}
          </td>
          <td width="100%" className="tvbVisTopN__bar">
            <div className="tvbVisTopN__innerBar" style={styles.innerBar}>
              <div style={styles.innerBarValue} />
            </div>
          </td>
          <td className="tvbVisTopN__value" data-test-subj="tsvbTopNValue">
            {formatter(lastValue)}
          </td>
        </tr>
      );
    };
  }

  render() {
    if (!this.props.series) return null;

    const intervalSettings = this.props.series.reduce(
      (acc, series, index) => {
        const value = getLastValue(series.data);

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
      <div className={className}>
        <table className="tvbVisTopN__table" data-test-subj="tvbVisTopNTable" ref={this.tableRef}>
          <tbody>{rows}</tbody>
        </table>
      </div>
    );
  }
}

TopN.defaultProps = {
  tickFormatter: n => n,
  onClick: i => i,
  direction: 'desc',
};

TopN.propTypes = {
  tickFormatter: PropTypes.func,
  onClick: PropTypes.func,
  series: PropTypes.array,
  reversed: PropTypes.bool,
  direction: PropTypes.string,
};
