/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Position } from '@elastic/charts';
import { i18n } from '@kbn/i18n';
import {
  AvailableReferenceLineIcons,
  FillStyles,
  IconPositions,
  LayerTypes,
  LineStyles,
  REFERENCE_LINE,
  EXTENDED_REFERENCE_LINE_DECORATION_CONFIG,
} from '../constants';
import { ReferenceLineFn } from '../types';
import { strings } from '../i18n';

export const referenceLineFunction: ReferenceLineFn = {
  name: REFERENCE_LINE,
  aliases: [],
  type: REFERENCE_LINE,
  help: strings.getRLHelp(),
  inputTypes: ['datatable', 'null'],
  args: {
    name: {
      types: ['string'],
      help: strings.getReferenceLineNameHelp(),
    },
    value: {
      types: ['number'],
      help: strings.getReferenceLineValueHelp(),
      required: true,
    },
    position: {
      types: ['string'],
      options: [Position.Right, Position.Left],
      help: i18n.translate('expressionXY.referenceLine.position.help', {
        defaultMessage:
          'Position of axis (first axis of that position) to which the reference line belongs.',
      }),
      default: Position.Left,
      strict: true,
    },
    axisId: {
      types: ['string'],
      help: i18n.translate('expressionXY.referenceLine.axisId.help', {
        defaultMessage:
          'Id of axis to which the reference line belongs. It has higher priority than "position"',
      }),
    },
    color: {
      types: ['string'],
      help: strings.getColorHelp(),
    },
    lineStyle: {
      types: ['string'],
      options: [...Object.values(LineStyles)],
      help: i18n.translate('expressionXY.decorationConfig.lineStyle.help', {
        defaultMessage: 'The style of the reference line',
      }),
      default: LineStyles.SOLID,
      strict: true,
    },
    lineWidth: {
      types: ['number'],
      help: i18n.translate('expressionXY.decorationConfig.lineWidth.help', {
        defaultMessage: 'The width of the reference line',
      }),
      default: 1,
    },
    icon: {
      types: ['string'],
      help: i18n.translate('expressionXY.decorationConfig.icon.help', {
        defaultMessage: 'An optional icon used for reference lines',
      }),
      options: [...Object.values(AvailableReferenceLineIcons)],
      strict: true,
    },
    iconPosition: {
      types: ['string'],
      options: [...Object.values(IconPositions)],
      help: i18n.translate('expressionXY.decorationConfig.iconPosition.help', {
        defaultMessage: 'The placement of the icon for the reference line',
      }),
      default: IconPositions.AUTO,
      strict: true,
    },
    textVisibility: {
      types: ['boolean'],
      help: i18n.translate('expressionXY.decorationConfig.textVisibility.help', {
        defaultMessage: 'Visibility of the label on the reference line',
      }),
    },
    fill: {
      types: ['string'],
      options: [...Object.values(FillStyles)],
      help: i18n.translate('expressionXY.decorationConfig.fill.help', {
        defaultMessage: 'Fill',
      }),
      default: FillStyles.NONE,
      strict: true,
    },
    forAccessor: {
      types: ['string'],
      help: '',
    },
  },
  fn(table, args) {
    const textVisibility =
      args.name !== undefined && args.textVisibility === undefined
        ? true
        : args.name === undefined
        ? false
        : args.textVisibility;

    const valueMeta =
      args.forAccessor && table
        ? table.columns.find(({ id }) => id === args.forAccessor)?.meta
        : undefined;

    return {
      type: REFERENCE_LINE,
      layerType: LayerTypes.REFERENCELINE,
      lineLength: table?.rows.length ?? 0,
      decorations: [
        { ...args, textVisibility, type: EXTENDED_REFERENCE_LINE_DECORATION_CONFIG, valueMeta },
      ],
    };
  },
};
