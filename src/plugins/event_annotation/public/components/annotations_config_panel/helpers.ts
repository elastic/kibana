/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

// import { search } from '@kbn/data-plugin/public';
import { transparentize } from '@elastic/eui';
// import type { DatatableUtilitiesService } from '@kbn/data-plugin/common';
import Color from 'color';
import { pick } from 'lodash';
// import moment from 'moment';
import { euiLightVars } from '@kbn/ui-theme';
import { i18n } from '@kbn/i18n';
import { isQueryAnnotationConfig, isRangeAnnotationConfig } from '../..';
import type {
  EventAnnotationConfig,
  RangeEventAnnotationConfig,
  PointInTimeEventAnnotationConfig,
  QueryPointEventAnnotationConfig,
} from '../../../common';
// import type { FramePublicAPI } from '../../../../types';
// import type { XYDataLayerConfig } from '../../types';

export const defaultAnnotationColor = euiLightVars.euiColorAccent;
// Do not compute it live as dependencies will add tens of Kbs to the plugin
export const defaultAnnotationRangeColor = `#F04E981A`; // defaultAnnotationColor with opacity 0.1

export const defaultAnnotationLabel = i18n.translate('xpack.lens.xyChart.defaultAnnotationLabel', {
  defaultMessage: 'Event',
});

export const defaultRangeAnnotationLabel = i18n.translate(
  'xpack.lens.xyChart.defaultRangeAnnotationLabel',
  {
    defaultMessage: 'Event range',
  }
);

export const toRangeAnnotationColor = (color = defaultAnnotationColor) => {
  return new Color(transparentize(color, 0.1)).hexa();
};

export const toLineAnnotationColor = (color = defaultAnnotationRangeColor) => {
  return new Color(transparentize(color, 1)).hex();
};

// export const getEndTimestamp = (
//   datatableUtilities: DatatableUtilitiesService,
//   startTime: string,
//   { activeData, dateRange }: FramePublicAPI,
//   dataLayers: XYDataLayerConfig[]
// ) => {
//   const startTimeNumber = moment(startTime).valueOf();
//   const dateRangeFraction =
//     (moment(dateRange.toDate).valueOf() - moment(dateRange.fromDate).valueOf()) * 0.1;
//   const fallbackValue = moment(startTimeNumber + dateRangeFraction).toISOString();
//   const dataLayersId = dataLayers.map(({ layerId }) => layerId);
//   if (
//     !dataLayersId.length ||
//     !activeData ||
//     Object.entries(activeData)
//       .filter(([key]) => dataLayersId.includes(key))
//       .every(([, { rows }]) => !rows || !rows.length)
//   ) {
//     return fallbackValue;
//   }
//   const xColumn = activeData?.[dataLayersId[0]].columns.find(
//     (column) => column.id === dataLayers[0].xAccessor
//   );
//   if (!xColumn) {
//     return fallbackValue;
//   }

//   const dateInterval = datatableUtilities.getDateHistogramMeta(xColumn)?.interval;
//   if (!dateInterval) return fallbackValue;
//   const intervalDuration = search.aggs.parseInterval(dateInterval);
//   if (!intervalDuration) return fallbackValue;
//   return moment(startTimeNumber + 3 * intervalDuration.as('milliseconds')).toISOString();
// };

export const sanitizeProperties = (annotation: EventAnnotationConfig) => {
  if (isRangeAnnotationConfig(annotation)) {
    const rangeAnnotation: RangeEventAnnotationConfig = pick(annotation, [
      'type',
      'label',
      'key',
      'id',
      'isHidden',
      'color',
      'outside',
    ]);
    return rangeAnnotation;
  }
  if (isQueryAnnotationConfig(annotation)) {
    const lineAnnotation: QueryPointEventAnnotationConfig = pick(annotation, [
      'type',
      'id',
      'label',
      'key',
      'timeField',
      'isHidden',
      'lineStyle',
      'lineWidth',
      'color',
      'icon',
      'textVisibility',
      'textField',
      'filter',
      'extraFields',
    ]);
    return lineAnnotation;
  }
  const lineAnnotation: PointInTimeEventAnnotationConfig = pick(annotation, [
    'type',
    'id',
    'label',
    'key',
    'isHidden',
    'lineStyle',
    'lineWidth',
    'color',
    'icon',
    'textVisibility',
  ]);
  return lineAnnotation;
};
