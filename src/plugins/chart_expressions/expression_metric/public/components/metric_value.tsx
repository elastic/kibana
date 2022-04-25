/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { CSSProperties } from 'react';
import classNames from 'classnames';
import { EuiIcon } from '@elastic/eui';
import type {
  MetricOptions,
  MetricStyle,
  MetricVisParam,
  IconBackgroundType,
  IconPosition,
} from '../../common/types';

interface MetricVisValueProps {
  metric: MetricOptions;
  onFilter?: () => void;
  style: MetricStyle;
  labelConfig: MetricVisParam['labels'];
  colorFullBackground: boolean;
  autoScale?: boolean;
  iconType: string;
  iconColor: string;
  iconPosition: IconPosition;
  iconSize: 'xl' | 'xxl' | 'l' | 'm';
  iconBackground: IconBackgroundType;
  iconAlignment: 'center' | 'start' | 'end';
}

const ORDER_FIRST = -2;
const ORDER_SECOND = -1;
const ORDER_THIRD = 2;
const ORDER_LAST = 3;

export const MetricVisValue = ({
  style,
  metric,
  onFilter,
  labelConfig,
  colorFullBackground,
  autoScale,
  iconBackground,
  iconAlignment,
  iconColor,
  iconPosition,
  iconSize,
  iconType,
}: MetricVisValueProps) => {
  const containerClassName = classNames('mtrVis__container', {
    'mtrVis__container--light': metric.lightText,
    'mtrVis__container-isfilterable': onFilter,
    'mtrVis__container-isfull': !autoScale && colorFullBackground,
    'mtrVis__container-iconLeft': iconPosition === 'left',
    'mtrVis__container-iconRight': iconPosition === 'right',
  });

  // for autoScale true we should add background to upper level so that correct colorize full container
  const metricComponent = (
    <div
      className={containerClassName}
      style={
        autoScale && colorFullBackground
          ? {
              ...(style.spec as CSSProperties),
              flexDirection: iconPosition === 'left' || iconPosition === 'right' ? 'row' : 'column',
            }
          : {
              backgroundColor: metric.bgColor,
              ...(style.spec as CSSProperties),
              flexDirection: iconPosition === 'left' || iconPosition === 'right' ? 'row' : 'column',
            }
      }
    >
      <div
        data-test-subj="metric_value"
        className="mtrVis__value"
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
            order: labelConfig.position === 'top' ? ORDER_SECOND : ORDER_THIRD,
          }}
        >
          {metric.label}
        </div>
      )}

      {iconType !== 'empty' && (
        <div
          className="mtrVis__icon"
          style={{
            order: iconPosition === 'above' || iconPosition === 'left' ? ORDER_FIRST : ORDER_LAST,
            justifyContent: iconAlignment,
          }}
        >
          <div
            className="mtrVis__iconContainer"
            style={{
              backgroundColor:
                iconBackground === 'none'
                  ? 'transparent'
                  : iconBackground === 'shadow'
                  ? '#0000001A'
                  : `${iconColor}1A`,
            }}
          >
            <EuiIcon
              className="mtrVis__iconInner"
              type={iconType}
              size={iconSize}
              color={iconColor}
              role="presentation"
            />
          </div>
        </div>
      )}
    </div>
  );

  if (onFilter) {
    return (
      <button style={{ display: 'block' }} onClick={() => onFilter()}>
        {metricComponent}
      </button>
    );
  }

  return metricComponent;
};
