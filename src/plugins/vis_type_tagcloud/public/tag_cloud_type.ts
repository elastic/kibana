/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { VIS_EVENT_TO_TRIGGER } from '../../visualizations/public';

import { TagCloudOptions } from './components/tag_cloud_options';
import { toExpressionAst } from './to_ast';

export const tagCloudVisTypeDefinition = {
  name: 'tagcloud',
  title: i18n.translate('visTypeTagCloud.vis.tagCloudTitle', { defaultMessage: 'Tag cloud' }),
  icon: 'visTagCloud',
  getSupportedTriggers: () => {
    return [VIS_EVENT_TO_TRIGGER.filter];
  },
  description: i18n.translate('visTypeTagCloud.vis.tagCloudDescription', {
    defaultMessage: 'Display word frequency with font size.',
  }),
  visConfig: {
    defaults: {
      scale: 'linear',
      orientation: 'single',
      minFontSize: 18,
      maxFontSize: 72,
      showLabel: true,
    },
  },
  toExpressionAst,
  editorConfig: {
    collections: {
      scales: [
        {
          text: i18n.translate('visTypeTagCloud.vis.editorConfig.scales.linearText', {
            defaultMessage: 'Linear',
          }),
          value: 'linear',
        },
        {
          text: i18n.translate('visTypeTagCloud.vis.editorConfig.scales.logText', {
            defaultMessage: 'Log',
          }),
          value: 'log',
        },
        {
          text: i18n.translate('visTypeTagCloud.vis.editorConfig.scales.squareRootText', {
            defaultMessage: 'Square root',
          }),
          value: 'square root',
        },
      ],
      orientations: [
        {
          text: i18n.translate('visTypeTagCloud.vis.editorConfig.orientations.singleText', {
            defaultMessage: 'Single',
          }),
          value: 'single',
        },
        {
          text: i18n.translate('visTypeTagCloud.vis.editorConfig.orientations.rightAngledText', {
            defaultMessage: 'Right angled',
          }),
          value: 'right angled',
        },
        {
          text: i18n.translate('visTypeTagCloud.vis.editorConfig.orientations.multipleText', {
            defaultMessage: 'Multiple',
          }),
          value: 'multiple',
        },
      ],
    },
    optionsTemplate: TagCloudOptions,
    schemas: [
      {
        group: 'metrics',
        name: 'metric',
        title: i18n.translate('visTypeTagCloud.vis.schemas.metricTitle', {
          defaultMessage: 'Tag size',
        }),
        min: 1,
        max: 1,
        aggFilter: [
          '!std_dev',
          '!percentiles',
          '!percentile_ranks',
          '!derivative',
          '!geo_bounds',
          '!geo_centroid',
        ],
        defaults: [{ schema: 'metric', type: 'count' }],
      },
      {
        group: 'buckets',
        name: 'segment',
        title: i18n.translate('visTypeTagCloud.vis.schemas.segmentTitle', {
          defaultMessage: 'Tags',
        }),
        min: 1,
        max: 1,
        aggFilter: ['terms', 'significant_terms'],
      },
    ],
  },
};
