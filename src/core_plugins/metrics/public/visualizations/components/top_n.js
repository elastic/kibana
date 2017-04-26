import React, { Component, PropTypes } from 'react';
import _ from 'lodash';
import getLastValue from '../lib/get_last_value';
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
      const lastValue = getLastValue(item.data, item.data.length);
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
        <tr key={key}
          onClick={this.handleClick({ lastValue, ...item })}
          style={styles.row}>
          <td width="1*" className="rhythm_top_n__label">{ item.label }</td>
          <td width="100%" className="rhythm_top_n__bar">
            <div className="rhythm_top_n__inner-bar"
              style={styles.innerBar}/>
          </td>
          <td width="1*" className="rhythm_top_n__value">{ value }</td>
        </tr>
      );
    };
  }

  render() {
    if (!this.props.series) return null;
    const maxValue = this.props.series.reduce((max, series) => {
      const lastValue = getLastValue(series.data, series.data.length);
      return lastValue > max ? lastValue : max;
    }, 0);

    const rows = _.sortBy(this.props.series, s => getLastValue(s.data, s.data.length))
      .reverse()
      .map(this.renderRow(maxValue));
    let className = 'rhythm_top_n';
    if (this.props.reversed) {
      className += ' reversed';
    }

    return (
      <div className={className}>
        <table className="rhythm_top_n__table">
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
  onClick: i => i
};

TopN.propTypes = {
  tickFormatter: PropTypes.func,
  onClick: PropTypes.func,
  series: PropTypes.array,
  reversed: PropTypes.bool
};

export default TopN;
