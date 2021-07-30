/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import classNames from 'classnames';

import { MetricVisMetric } from '../types';

interface MetricVisValueProps {
  metric: MetricVisMetric;
  fontSize: number;
  onFilter?: (metric: MetricVisMetric) => void;
  showLabel?: boolean;
}

export const MetricVisValue = ({ fontSize, metric, onFilter, showLabel }: MetricVisValueProps) => {
  const containerClassName = classNames('mtrVis__container', {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    'mtrVis__container--light': metric.lightText,
    // eslint-disable-next-line @typescript-eslint/naming-convention
    'mtrVis__container-isfilterable': onFilter,
  });

  const metricComponent = (
    <div className={containerClassName} style={{ backgroundColor: metric.bgColor }}>
      <div
        className="mtrVis__value"
        style={{
          fontSize: `${fontSize}pt`,
          color: metric.color,
        }}
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

  if (onFilter) {
    return (
      <button style={{ display: 'block' }} onClick={() => onFilter(metric)}>
        {metricComponent}
      </button>
    );
  }

  return metricComponent;
};
