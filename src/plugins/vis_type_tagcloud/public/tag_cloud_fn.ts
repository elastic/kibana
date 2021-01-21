/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { i18n } from '@kbn/i18n';

import { ExpressionFunctionDefinition, Datatable, Render } from '../../expressions/public';
import { TagCloudVisParams } from './types';

const name = 'tagcloud';

interface Arguments extends TagCloudVisParams {
  metric: any; // these aren't typed yet
  bucket?: any; // these aren't typed yet
}

export interface TagCloudVisRenderValue {
  visType: typeof name;
  visData: Datatable;
  visParams: Arguments;
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
    } as Arguments;

    if (args.bucket !== undefined) {
      visParams.bucket = args.bucket;
    }

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
      },
    };
  },
});
