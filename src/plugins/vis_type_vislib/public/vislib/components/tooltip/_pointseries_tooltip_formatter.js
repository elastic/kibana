/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

export function pointSeriesTooltipFormatter() {
  return function tooltipFormatter({ datum, data }) {
    if (!datum) return '';

    const details = [];

    const currentSeries =
      data.series && data.series.find((serie) => serie.rawId === datum.seriesId);
    const addDetail = (label, value) => details.push({ label, value });

    if (datum.extraMetrics) {
      datum.extraMetrics.forEach((metric) => {
        addDetail(metric.label, metric.value);
      });
    }

    if (datum.x !== null && datum.x !== undefined) {
      addDetail(data.xAxisLabel, data.xAxisFormatter(datum.x));
    }

    if (datum.y !== null && datum.y !== undefined) {
      const value = datum.yScale ? datum.yScale * datum.y : datum.y;
      addDetail(currentSeries.label, currentSeries.yAxisFormatter(value));
    }

    if (datum.z !== null && datum.z !== undefined) {
      addDetail(currentSeries.zLabel, currentSeries.zAxisFormatter(datum.z));
    }
    if (datum.series && datum.parent) {
      const dimension = datum.parent;
      addDetail(dimension.title, datum.series);
    }
    if (datum.tableRaw) {
      addDetail(datum.tableRaw.title, datum.tableRaw.value);
    }

    return renderToStaticMarkup(
      <table>
        <tbody>
          {details.map((detail, index) => (
            <tr key={index}>
              <td className="visTooltip__label">
                <div className="visTooltip__labelContainer">{detail.label}</div>
              </td>

              <td className="visTooltip__value">
                <div className="visTooltip__valueContainer">
                  {detail.value}
                  {detail.percent && <span> ({detail.percent})</span>}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  };
}
