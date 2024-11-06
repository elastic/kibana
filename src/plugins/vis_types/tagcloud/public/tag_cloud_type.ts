/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import { AggGroupNames } from '@kbn/data-plugin/public';
import { VIS_EVENT_TO_TRIGGER } from '@kbn/visualizations-plugin/public';
import type { TimefilterContract } from '@kbn/data-plugin/public';
import type { Vis } from '@kbn/visualizations-plugin/public';
import type { TagCloudVisParams } from './types';
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
    fetchDatatable: true,
    toExpressionAst,
    editorConfig: {
      enableDataViewChange: true,
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
            '!single_percentile_rank',
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
    navigateToLens: async (vis?: Vis<TagCloudVisParams>, timefilter?: TimefilterContract) => {
      const { convertToLens } = await import('./convert_to_lens');
      return vis ? convertToLens(vis, timefilter) : null;
    },
    getExpressionVariables: async (
      vis?: Vis<TagCloudVisParams>,
      timeFilter?: TimefilterContract
    ) => {
      const { convertToLens } = await import('./convert_to_lens');
      return {
        canNavigateToLens: Boolean(vis?.params ? await convertToLens(vis, timeFilter) : null),
      };
    },
  };
};
