/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { CSSProperties, useLayoutEffect } from 'react';
import classNames from 'classnames';
import { i18n } from '@kbn/i18n';
import type { MetricOptions, MetricStyle, MetricVisParam } from '../../common/types';

interface MetricVisValueProps {
  metric: MetricOptions;
  onFilter?: () => void;
  style: MetricStyle;
  labelConfig: MetricVisParam['labels'];
  colorFullBackground: boolean;
  autoScale?: boolean;
  renderComplete?: () => void;
}

export const MetricVisValue = (props: MetricVisValueProps) => {
  const { style, metric, onFilter, labelConfig, colorFullBackground, autoScale } = props;
  const containerClassName = classNames('legacyMtrVis__container', {
    'legacyMtrVis__container--light': metric.lightText,
    'legacyMtrVis__container-isfilterable': onFilter,
    'legacyMtrVis__container-isfull': !autoScale && colorFullBackground,
  });

  useLayoutEffect(() => {
    props.renderComplete?.();
  }, [props]);

  // for autoScale true we should add background to upper level so that correct colorize full container
  const metricComponent = (
    <div
      className={containerClassName}
      style={autoScale && colorFullBackground ? {} : { backgroundColor: metric.bgColor }}
    >
      <div
        data-test-subj="metric_value"
        className="legacyMtrVis__value"
        style={{
          ...(style.spec as CSSProperties),
          ...(metric.color ? { color: metric.color } : {}),
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
      {labelConfig.show && (
        <div
          data-test-subj="metric_label"
          style={{
            ...(labelConfig.style.spec as CSSProperties),
            order: labelConfig.position === 'top' ? -1 : 2,
          }}
        >
          {metric.label}
        </div>
      )}
    </div>
  );

  if (onFilter) {
    return (
      <button
        style={{ display: 'block' }}
        onClick={() => onFilter()}
        title={i18n.translate('expressionLegacyMetricVis.filterTitle', {
          defaultMessage: 'Click to filter by field',
        })}
      >
        {metricComponent}
      </button>
    );
  }

  return metricComponent;
};
