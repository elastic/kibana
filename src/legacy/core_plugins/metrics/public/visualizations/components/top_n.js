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
import getLastValue from '../../../common/get_last_value';
import reactcss from 'reactcss';

class TopN extends Component {

  handleClick(item) {
    return () => {
      if (this.props.onClick) {
        this.props.onClick(item);
      }
    };
  }

  renderRow(maxValue) {
    return item => {
      const key = `${item.id || item.label}`;
      const lastValue = getLastValue(item.data);
      const formatter = item.tickFormatter || this.props.tickFormatter;
      const value = formatter(lastValue);
      const width = `${100 * (lastValue / maxValue)}%`;
      const backgroundColor = item.color;
      const styles = reactcss({
        default: {
          innerBar: {
            width,
            backgroundColor
          }
        },
        onClick: {
          row: {
            cursor: 'pointer'
          }
        }
      }, this.props);
      return (
        <tr
          key={key}
          onClick={this.handleClick({ lastValue, ...item })}
          style={styles.row}
        >
          <td width="1*" className="tvbVisTopN__label">{ item.label }</td>
          <td width="100%" className="tvbVisTopN__bar">
            <div
              className="tvbVisTopN__innerBar"
              style={styles.innerBar}
            />
          </td>
          <td width="1*" className="tvbVisTopN__value" data-test-subj="tsvbTopNValue">{ value }</td>
        </tr>
      );
    };
  }

  render() {
    if (!this.props.series) return null;
    const maxValue = this.props.series.reduce((max, series) => {
      const lastValue = getLastValue(series.data);
      return lastValue > max ? lastValue : max;
    }, 0);

    const rows = this.props.series.map(this.renderRow(maxValue));
    let className = 'tvbVisTopN';
    if (this.props.reversed) {
      className += ' tvbVisTopN--reversed';
    }

    return (
      <div className={className}>
        <table className="tvbVisTopN__table">
          <tbody>
            { rows }
          </tbody>
        </table>
      </div>
    );
  }

}

TopN.defaultProps = {
  tickFormatter: n => n,
  onClick: i => i,
  direction: 'desc'
};

TopN.propTypes = {
  tickFormatter: PropTypes.func,
  onClick: PropTypes.func,
  series: PropTypes.array,
  reversed: PropTypes.bool,
  direction: PropTypes.string
};

export default TopN;
