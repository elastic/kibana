/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';

import { ExpressionFunctionDefinition, Datatable, Render } from '../../expressions/public';
import { TagCloudVisParams, TagCloudVisConfig } from './types';

const name = 'tagcloud';

interface Arguments extends TagCloudVisConfig {
  palette: string;
}

export interface TagCloudVisRenderValue {
  visType: typeof name;
  visData: Datatable;
  visParams: TagCloudVisParams;
  syncColors: boolean;
}

export type TagcloudExpressionFunctionDefinition = ExpressionFunctionDefinition<
  typeof name,
  Datatable,
  Arguments,
  Render<TagCloudVisRenderValue>
>;

export const createTagCloudFn = (): TagcloudExpressionFunctionDefinition => ({
  name,
  type: 'render',
  inputTypes: ['datatable'],
  help: i18n.translate('visTypeTagCloud.function.help', {
    defaultMessage: 'Tagcloud visualization',
  }),
  args: {
    scale: {
      types: ['string'],
      default: 'linear',
      options: ['linear', 'log', 'square root'],
      help: i18n.translate('visTypeTagCloud.function.scale.help', {
        defaultMessage: 'Scale to determine font size of a word',
      }),
    },
    orientation: {
      types: ['string'],
      default: 'single',
      options: ['single', 'right angled', 'multiple'],
      help: i18n.translate('visTypeTagCloud.function.orientation.help', {
        defaultMessage: 'Orientation of words inside tagcloud',
      }),
    },
    minFontSize: {
      types: ['number'],
      default: 18,
      help: '',
    },
    maxFontSize: {
      types: ['number'],
      default: 72,
      help: '',
    },
    showLabel: {
      types: ['boolean'],
      default: true,
      help: '',
    },
    palette: {
      types: ['string'],
      help: i18n.translate('visTypeTagCloud.function.paletteHelpText', {
        defaultMessage: 'Defines the chart palette name',
      }),
      default: 'default',
    },
    metric: {
      types: ['vis_dimension'],
      help: i18n.translate('visTypeTagCloud.function.metric.help', {
        defaultMessage: 'metric dimension configuration',
      }),
      required: true,
    },
    bucket: {
      types: ['vis_dimension'],
      help: i18n.translate('visTypeTagCloud.function.bucket.help', {
        defaultMessage: 'bucket dimension configuration',
      }),
    },
  },
  fn(input, args, handlers) {
    const visParams = {
      scale: args.scale,
      orientation: args.orientation,
      minFontSize: args.minFontSize,
      maxFontSize: args.maxFontSize,
      showLabel: args.showLabel,
      metric: args.metric,
      ...(args.bucket && {
        bucket: args.bucket,
      }),
      palette: {
        type: 'palette',
        name: args.palette,
      },
    } as TagCloudVisParams;

    if (handlers?.inspectorAdapters?.tables) {
      handlers.inspectorAdapters.tables.logDatatable('default', input);
    }
    return {
      type: 'render',
      as: 'tagloud_vis',
      value: {
        visData: input,
        visType: name,
        visParams,
        syncColors: handlers?.isSyncColorsEnabled?.() ?? false,
      },
    };
  },
});
