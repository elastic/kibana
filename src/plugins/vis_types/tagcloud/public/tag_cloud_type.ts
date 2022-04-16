/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { AggGroupNames } from '@kbn/data-plugin/public';
import { VIS_EVENT_TO_TRIGGER } from '@kbn/visualizations-plugin/public';

import { getTagCloudOptions } from './components/get_tag_cloud_options';
import { toExpressionAst } from './to_ast';
import { TagCloudVisDependencies } from './plugin';

export const getTagCloudVisTypeDefinition = ({ palettes }: TagCloudVisDependencies) => {
  return {
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
        palette: {
          name: 'default',
          type: 'palette',
        },
      },
    },
    toExpressionAst,
    editorConfig: {
      optionsTemplate: getTagCloudOptions({
        palettes,
      }),
      schemas: [
        {
          group: AggGroupNames.Metrics,
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
            '!filtered_metric',
            '!single_percentile',
          ],
          defaults: [{ schema: 'metric', type: 'count' }],
        },
        {
          group: AggGroupNames.Buckets,
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
    requiresSearch: true,
  };
};
