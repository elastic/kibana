import React, { Component } from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';

import {
  EuiKeyboardAccessible
} from '@elastic/eui';

class MetricVisValue extends Component {

  onClick = () => {
    this.props.onFilter(this.props.metric);
  };

  render() {
    const { fontSize, metric, onFilter, showLabel } = this.props;
    const hasFilter = !!onFilter;

    const metricValueStyle = {
      fontSize: `${fontSize}pt`,
      color: metric.color,
    };

    const containerClassName = classNames('metric-container', {
      'metric-container--light': metric.lightText,
      'metric-container--filterable': hasFilter
    });

    const metricComponent = (
      <div
        className={containerClassName}
        style={{ backgroundColor: metric.bgColor }}
        onClick={hasFilter ? this.onClick : null}
        tabIndex={hasFilter ? 0 : null}
        role={hasFilter ? 'button' : null}
      >
        <div
          className="metric-value"
          style={metricValueStyle}
          dangerouslySetInnerHTML={{ __html: metric.value }}
        />
        { showLabel &&
          <div>{metric.label}</div>
        }
      </div>
    );

    if (this.onClick) {
      return (<EuiKeyboardAccessible>{metricComponent}</EuiKeyboardAccessible>);
    }

    return metricComponent;
  }
}

MetricVisValue.propTypes = {
  fontSize: PropTypes.number.isRequired,
  metric: PropTypes.object.isRequired,
  onFilter: PropTypes.func,
  showLabel: PropTypes.bool,
};

export { MetricVisValue };
