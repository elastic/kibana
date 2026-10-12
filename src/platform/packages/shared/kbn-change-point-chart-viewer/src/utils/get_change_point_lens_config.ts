/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  LensAnnotationLayer,
  LensSeriesLayer,
  LensXYConfig,
} from '@kbn/lens-embeddable-utils/config_builder';
import type { ChangePointCardModel } from './derive_change_point_cards';

export const getChangePointLensConfig = ({
  card,
  timeColumn,
  valueColumn,
  annotationColor,
}: {
  card: ChangePointCardModel;
  timeColumn: string;
  valueColumn: string;
  annotationColor: string;
}): LensXYConfig => {
  const seriesLayer: LensSeriesLayer = {
    type: 'series',
    seriesType: 'area',
    // String xAxis omits `meta.type: date`, so Lens treats X as ordinal — not a time chart and
    // event annotations do not render. Date histogram maps the ES|QL time column as interval/date.
    xAxis: { type: 'dateHistogram', field: timeColumn, minimumInterval: 'auto' },
    yAxis: [
      {
        value: valueColumn,
        label: valueColumn,
      },
    ],
  };

  const layers: LensXYConfig['layers'] = [seriesLayer];

  if (card.annotationEvents.length) {
    const annotationLayer: LensAnnotationLayer = {
      type: 'annotation',
      yAxis: [],
      events: card.annotationEvents.map((e) => ({
        name: e.name,
        datetime: e.datetime,
        icon: 'triangle',
        color: annotationColor,
      })),
    };
    layers.push(annotationLayer);
  }

  return {
    chartType: 'xy',
    dataset: { esql: card.lineEsql },
    title: card.title,
    legend: { show: false },
    axisTitleVisibility: {
      showXAxisTitle: false,
      showYAxisTitle: false,
      showYRightAxisTitle: false,
    },
    layers,
    fittingFunction: 'Linear',
  };
};
