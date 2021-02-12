/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { UI_SETTINGS } from '../../../../../../plugins/data/public';
import { getValueForPercentageMode } from '../../percentage_mode_transform';

function getMax(handler, config, isGauge) {
  let max;
  if (handler.pointSeries) {
    const series = handler.pointSeries.getSeries();
    const scale = series.getValueAxis().getScale();
    max = scale.domain()[1];
  } else {
    max = _.last(config.get(isGauge ? 'gauge.colorsRange' : 'colorsRange', [{}])).to
  }

  return max;
}

export function pointSeriesTooltipFormatter() {
  return function tooltipFormatter({ datum, data, config, handler }) {
    if (!datum) return '';

    const details = [];
    const isGauge = config.get('gauge', false);
    const isPercentageMode = config.get(isGauge ? 'gauge.percentageMode' : 'percentageMode', false);
    const isSetColorRange = config.get('setColorRange', false);

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
      let value = datum.yScale ? datum.yScale * datum.y : datum.y;
      if (isPercentageMode && !isSetColorRange) {
        const percentageFormatPattern = config.get(isGauge ? 'gauge.percentageFormatPattern' : 'percentageFormatPattern', handler.uiSettings.get(UI_SETTINGS.FORMAT_PERCENT_DEFAULT_PATTERN));
        value = getValueForPercentageMode(value / getMax(handler, config, isGauge), percentageFormatPattern);
        addDetail(currentSeries.label, value);
      } else {
        addDetail(currentSeries.label, currentSeries.yAxisFormatter(value));
      } 
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
