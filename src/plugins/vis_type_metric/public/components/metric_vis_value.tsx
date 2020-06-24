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

import React, { Component, KeyboardEvent } from 'react';
import classNames from 'classnames';

import { EuiKeyboardAccessible, keys } from '@elastic/eui';

import { MetricVisMetric } from '../types';

interface MetricVisValueProps {
  metric: MetricVisMetric;
  fontSize: number;
  onFilter?: (metric: MetricVisMetric) => void;
  showLabel?: boolean;
}

export class MetricVisValue extends Component<MetricVisValueProps> {
  onClick = () => {
    if (this.props.onFilter) {
      this.props.onFilter(this.props.metric);
    }
  };

  onKeyPress = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === keys.ENTER) {
      this.onClick();
    }
  };

  render() {
    const { fontSize, metric, onFilter, showLabel } = this.props;
    const hasFilter = Boolean(onFilter);

    const metricValueStyle = {
      fontSize: `${fontSize}pt`,
      color: metric.color,
    };

    const containerClassName = classNames('mtrVis__container', {
      'mtrVis__container--light': metric.lightText,
      'mtrVis__container-isfilterable': hasFilter,
    });

    const metricComponent = (
      <div
        className={containerClassName}
        style={{ backgroundColor: metric.bgColor }}
        onClick={hasFilter ? this.onClick : undefined}
        onKeyPress={hasFilter ? this.onKeyPress : undefined}
        tabIndex={hasFilter ? 0 : undefined}
        role={hasFilter ? 'button' : undefined}
      >
        <div
          className="mtrVis__value"
          style={metricValueStyle}
          /*
           * Justification for dangerouslySetInnerHTML:
           * This is one of the visualizations which makes use of the HTML field formatters.
           * Since these formatters produce raw HTML, this visualization needs to be able to render them as-is, relying
           * on the field formatter to only produce safe HTML.
           * `metric.value` is set by the MetricVisComponent, so this component must make sure this value never contains
           * any unsafe HTML (e.g. by bypassing the field formatter).
           */
          dangerouslySetInnerHTML={{ __html: metric.value }} // eslint-disable-line react/no-danger
        />
        {showLabel && <div>{metric.label}</div>}
      </div>
    );

    if (hasFilter) {
      return <EuiKeyboardAccessible>{metricComponent}</EuiKeyboardAccessible>;
    }

    return metricComponent;
  }
}
