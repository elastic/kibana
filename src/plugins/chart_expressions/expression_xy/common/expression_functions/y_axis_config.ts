/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import type { ExpressionFunctionDefinition } from '@kbn/expressions-plugin/common';
import { Y_AXIS_CONFIG, AxisModes, AXIS_EXTENT_CONFIG, YScaleTypes } from '../constants';
import { YConfig, YConfigResult } from '../types';

export const yAxisConfigFunction: ExpressionFunctionDefinition<
  typeof Y_AXIS_CONFIG,
  null,
  YAxisConfig,
  YAxisConfigResult
> = {
  name: Y_AXIS_CONFIG,
  aliases: [],
  type: Y_AXIS_CONFIG,
  help: i18n.translate('expressionXY.axisConfig.help', {
    defaultMessage: `Configure the xy chart's axis config`,
  }),
  inputTypes: ['null'],
  args: {
    title: {
      types: ['string'],
      help: i18n.translate('expressionXY.axisConfig.title.help', {
        defaultMessage: 'Title of axis',
      }),
    },
    id: {
      types: ['string'],
      help: i18n.translate('expressionXY.axisConfig.id.help', {
        defaultMessage: 'Id of axis',
      }),
    },
    position: {
      types: ['string'],
      help: i18n.translate('expressionXY.axisConfig.position.help', {
        defaultMessage: 'Position of the axis',
      }),
      default: 'left',
    },
    hide: {
      types: ['boolean'],
      help: i18n.translate('expressionXY.axisConfig.boolean.help', {
        defaultMessage: 'Hide the specified axis',
      }),
    },
    mode: {
      types: ['string'],
      options: [...Object.values(AxisModes)],
      help: i18n.translate('expressionXY.axisConfig.mode.help', {
        defaultMessage: 'Scale mode. Can be normal, percentage, wiggle or silhouette',
      }),
    },
    boundsMargin: {
      types: ['number'],
      help: i18n.translate('expressionXY.axisConfig.boundsMargin.help', {
        defaultMessage: 'Margin of bounds',
      }),
    },
    labelColor: {
      types: ['string'],
      help: i18n.translate('expressionXY.axisConfig.labelColor.help', {
        defaultMessage: 'Color of the axis labels',
      }),
    },
    showOverlappingLabels: {
      types: ['boolean'],
      help: i18n.translate('expressionXY.axisConfig.showOverlappingLabels.help', {
        defaultMessage: 'Show overlapping labels',
      }),
    },
    showDuplicates: {
      types: ['boolean'],
      help: i18n.translate('expressionXY.axisConfig.showDuplicates.help', {
        defaultMessage: 'Show duplicated ticks',
      }),
    },
    showGridLines: {
      types: ['boolean'],
      help: i18n.translate('expressionXY.axisConfig.showGridLines.help', {
        defaultMessage: 'Specifies whether or not the gridlines of the axis are visible.',
      }),
      default: false,
    },
    labelsOrientation: {
      types: ['number'],
      options: [0, -90, -45],
      help: i18n.translate('expressionXY.axisConfig.labelsOrientation.help', {
        defaultMessage: 'Specifies the labels orientation of the axis.',
      }),
    },
    showLabels: {
      types: ['boolean'],
      help: i18n.translate('expressionXY.axisConfig.showLabels.help', {
        defaultMessage: 'Show labels',
      }),
      default: true,
    },
    showTitle: {
      types: ['boolean'],
      help: i18n.translate('expressionXY.axisConfig.showTitle.help', {
        defaultMessage: 'Show title of the axis',
      }),
      default: true,
    },
    truncate: {
      types: ['number'],
      help: i18n.translate('expressionXY.axisConfig.truncate.help', {
        defaultMessage: 'The number of symbols before truncating',
      }),
    },
    extent: {
      types: [AXIS_EXTENT_CONFIG],
      help: i18n.translate('expressionXY.yAxisConfig.extent.help', {
        defaultMessage: 'Axis extents',
      }),
      default: `{${AXIS_EXTENT_CONFIG}}`,
    },
    scaleType: {
      options: [...Object.values(YScaleTypes)],
      help: i18n.translate('expressionXY.yAxisConfig.scaleType.help', {
        defaultMessage: 'The scale type of the axis',
      }),
      default: YScaleTypes.LINEAR,
    },
  },
  fn(input, args) {
    return {
      type: Y_AXIS_CONFIG,
      ...args,
    };
  },
};
