/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import type { MetricOptions, MetricStyle, MetricVisParam } from '../../common/types';
import {Chart, DARK_THEME, Metric, Settings} from '@elastic/charts';

interface MetricVisValueProps {
  metric: MetricOptions;
  onFilter?: () => void;
  style: MetricStyle;
  labelConfig: MetricVisParam['labels'];
  colorFullBackground: boolean;
  autoScale?: boolean;
}

export const MetricVisValue = ({
  style,
  metric,
  onFilter,
  labelConfig,
  colorFullBackground,
  autoScale,
}: MetricVisValueProps) => {

  //
  // const containerClassName = classNames('mtrVis__container', {
  //   'mtrVis__container--light': metric.lightText,
  //   'mtrVis__container-isfilterable': onFilter,
  //   'mtrVis__container-isfull': !autoScale && colorFullBackground,
  // });
  //
  // // for autoScale true we should add background to upper level so that correct colorize full container
  // const metricComponent = (
  //   <div
  //     className={containerClassName}
  //     style={autoScale && colorFullBackground ? {} : { backgroundColor: metric.bgColor }}
  //   >
  //     <div
  //       data-test-subj="metric_value"
  //       className="mtrVis__value"
  //       style={{
  //         ...(style.spec as CSSProperties),
  //         ...(metric.color ? { color: metric.color } : {}),
  //       }}
  //       /*
  //        * Justification for dangerouslySetInnerHTML:
  //        * This is one of the visualizations which makes use of the HTML field formatters.
  //        * Since these formatters produce raw HTML, this visualization needs to be able to render them as-is, relying
  //        * on the field formatter to only produce safe HTML.
  //        * `metric.value` is set by the MetricVisComponent, so this component must make sure this value never contains
  //        * any unsafe HTML (e.g. by bypassing the field formatter).
  //        */
  //       dangerouslySetInnerHTML={{ __html: metric.value }} // eslint-disable-line react/no-danger
  //     />
  //     {labelConfig.show && (
  //       <div
  //         data-test-subj="metric_label"
  //         style={{
  //           ...(labelConfig.style.spec as CSSProperties),
  //           order: labelConfig.position === 'top' ? -1 : 2,
  //         }}
  //       >
  //         {metric.label}
  //       </div>
  //     )}
  //   </div>
  // );
  //
  // if (onFilter) {
  //   return (
  //     <button style={{ display: 'block' }} onClick={() => onFilter()}>
  //       {metricComponent}
  //     </button>
  //   );
  // }
  // value: number;
  // unit: string;
  // color: Color;
  // domain?: [min: number, max: number];
  // title?: string;
  // subtitle?: string;
  // extra?: ReactElement;
  console.log(metric);

  const value = metric.unit === 'percent' ? Number((metric.value * 100).toFixed(2)) : metric.value;

  return <div style={{position:"absolute", top:0, left: 0, right: 0, bottom:0}
  }><Chart>
    <Settings theme={DARK_THEME} />
    <Metric
      id="1"
      progressMode={[metric.domain ? 'small' : 'full', 'vertical']}
      data={[
        [
          {
            value: value,
            color: metric.bgColor,
            valueFormatter: metric.formatter,
            domain: metric.domain,
            title: metric.label,
            subTitle: metric.lightText,
          }
        ]
      ]}
    />
  </Chart></div>;
};
