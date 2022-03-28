/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { i18n } from '@kbn/i18n';

import {
  prepareLogTable,
  Dimension,
  validateAccessor,
} from '../../../../visualizations/common/utils';
import { TagCloudRendererParams } from '../types';
import { ExpressionTagcloudFunction } from '../types';
import { EXPRESSION_NAME, ScaleOptions, Orientation } from '../constants';

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
    ariaLabel: i18n.translate('expressionTagcloud.functions.tagcloud.args.ariaLabelHelpText', {
      defaultMessage: 'Specifies the aria label of the tagcloud',
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
        default: ScaleOptions.LINEAR,
        options: [ScaleOptions.LINEAR, ScaleOptions.LOG, ScaleOptions.SQUARE_ROOT],
        help: argHelp.scale,
        strict: true,
      },
      orientation: {
        types: ['string'],
        default: Orientation.SINGLE,
        options: [Orientation.SINGLE, Orientation.RIGHT_ANGLED, Orientation.MULTIPLE],
        help: argHelp.orientation,
        strict: true,
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
        types: ['palette', 'system_palette'],
        help: argHelp.palette,
        default: '{palette}',
      },
      metric: {
        types: ['vis_dimension', 'string'],
        help: argHelp.metric,
        required: true,
      },
      bucket: {
        types: ['vis_dimension', 'string'],
        help: argHelp.bucket,
      },
      ariaLabel: {
        types: ['string'],
        help: argHelp.ariaLabel,
        required: false,
      },
    },
    fn(input, args, handlers) {
      validateAccessor(args.metric, input.columns);
      validateAccessor(args.bucket, input.columns);

      const visParams: TagCloudRendererParams = {
        scale: args.scale,
        orientation: args.orientation,
        minFontSize: args.minFontSize,
        maxFontSize: args.maxFontSize,
        showLabel: args.showLabel,
        metric: args.metric,
        ...(args.bucket && {
          bucket: args.bucket,
        }),
        palette: args.palette,
        ariaLabel:
          args.ariaLabel ??
          (handlers.variables?.embeddableTitle as string) ??
          handlers.getExecutionContext?.()?.description,
      };

      if (handlers?.inspectorAdapters?.tables) {
        const argsTable: Dimension[] = [[[args.metric], dimension.tagSize]];
        if (args.bucket) {
          argsTable.push([[args.bucket], dimension.tags]);
        }
        const logTable = prepareLogTable(input, argsTable, true);
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
