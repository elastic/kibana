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
          /*
           * Justification for dangerouslySetInnerHTML:
           * This is one of the visualizations which makes use of the HTML field formatters.
           * Since these formatters produce raw HTML, this visualization needs to be able to render them as-is, relying
           * on the field formatter to only produce safe HTML.
           * `metric.value` is set by the MetricVisComponent, so this component must make sure this value never contains
           * any unsafe HTML (e.g. by bypassing the field formatter).
           */
          dangerouslySetInnerHTML={{ __html: metric.value }} //eslint-disable-line react/no-danger
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
