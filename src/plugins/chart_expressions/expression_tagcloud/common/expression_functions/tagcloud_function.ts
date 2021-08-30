/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { i18n } from '@kbn/i18n';

import { prepareLogTable, Dimension } from '../../../../visualizations/common/prepare_log_table';
import { TagCloudVisParams } from '../types';
import { ExpressionTagcloudFunction } from '../types';
import { EXPRESSION_NAME } from '../constants';

const strings = {
  help: i18n.translate('expressionTagcloud.functions.tagcloudHelpText', {
    defaultMessage: 'Tagcloud visualization.',
  }),
  args: {
    scale: i18n.translate('expressionTagcloud.functions.tagcloud.args.scaleHelpText', {
      defaultMessage: 'Scale to determine font size of a word',
    }),
    orientation: i18n.translate('expressionTagcloud.functions.tagcloud.args.orientationHelpText', {
      defaultMessage: 'Orientation of words inside tagcloud',
    }),
    minFontSize: i18n.translate('expressionTagcloud.functions.tagcloud.args.minFontSizeHelpText', {
      defaultMessage: 'Min font size',
    }),
    maxFontSize: i18n.translate('expressionTagcloud.functions.tagcloud.args.maxFontSizeHelpText', {
      defaultMessage: 'Max font size',
    }),
    showLabel: i18n.translate('expressionTagcloud.functions.tagcloud.args.showLabelHelpText', {
      defaultMessage: 'Show chart label',
    }),
    palette: i18n.translate('expressionTagcloud.functions.tagcloud.args.paletteHelpText', {
      defaultMessage: 'Defines the chart palette name',
    }),
    metric: i18n.translate('expressionTagcloud.functions.tagcloud.args.metricHelpText', {
      defaultMessage: 'metric dimension configuration',
    }),
    bucket: i18n.translate('expressionTagcloud.functions.tagcloud.args.bucketHelpText', {
      defaultMessage: 'bucket dimension configuration',
    }),
  },
  dimension: {
    tags: i18n.translate('expressionTagcloud.functions.tagcloud.dimension.tags', {
      defaultMessage: 'Tags',
    }),
    tagSize: i18n.translate('expressionTagcloud.functions.tagcloud.dimension.tagSize', {
      defaultMessage: 'Tag size',
    }),
  },
};

export const errors = {
  invalidPercent: (percent: number) =>
    new Error(
      i18n.translate('expressionTagcloud.functions.tagcloud.invalidPercentErrorMessage', {
        defaultMessage: "Invalid value: '{percent}'. Percentage must be between 0 and 1",
        values: {
          percent,
        },
      })
    ),
  invalidImageUrl: (imageUrl: string) =>
    new Error(
      i18n.translate('expressionTagcloud.functions.tagcloud.invalidImageUrl', {
        defaultMessage: "Invalid image url: '{imageUrl}'.",
        values: {
          imageUrl,
        },
      })
    ),
};

export const tagcloudFunction: ExpressionTagcloudFunction = () => {
  const { help, args: argHelp, dimension } = strings;

  return {
    name: EXPRESSION_NAME,
    type: 'render',
    inputTypes: ['datatable'],
    help,
    args: {
      scale: {
        types: ['string'],
        default: 'linear',
        options: ['linear', 'log', 'square root'],
        help: argHelp.scale,
      },
      orientation: {
        types: ['string'],
        default: 'single',
        options: ['single', 'right angled', 'multiple'],
        help: argHelp.orientation,
      },
      minFontSize: {
        types: ['number'],
        default: 18,
        help: argHelp.minFontSize,
      },
      maxFontSize: {
        types: ['number'],
        default: 72,
        help: argHelp.maxFontSize,
      },
      showLabel: {
        types: ['boolean'],
        default: true,
        help: argHelp.showLabel,
      },
      palette: {
        types: ['string'],
        help: argHelp.palette,
        default: 'default',
      },
      metric: {
        types: ['vis_dimension'],
        help: argHelp.metric,
        required: true,
      },
      bucket: {
        types: ['vis_dimension'],
        help: argHelp.bucket,
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
        const argsTable: Dimension[] = [[[args.metric], dimension.tagSize]];
        if (args.bucket) {
          argsTable.push([[args.bucket], dimension.tags]);
        }
        const logTable = prepareLogTable(input, argsTable);
        handlers.inspectorAdapters.tables.logDatatable('default', logTable);
      }
      return {
        type: 'render',
        as: EXPRESSION_NAME,
        value: {
          visData: input,
          visType: EXPRESSION_NAME,
          visParams,
          syncColors: handlers?.isSyncColorsEnabled?.() ?? false,
        },
      };
    },
  };
};
