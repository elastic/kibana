/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ExpressionFunctionDefinition } from '@kbn/expressions-plugin/common';
import { i18n } from '@kbn/i18n';
import { AvailableAnnotationIcons } from '@kbn/event-annotation-common';

import type {
  ManualRangeEventAnnotationArgs,
  ManualRangeEventAnnotationOutput,
  ManualPointEventAnnotationArgs,
  ManualPointEventAnnotationOutput,
} from './types';

export const manualPointEventAnnotation: ExpressionFunctionDefinition<
  'manual_point_event_annotation',
  null,
  ManualPointEventAnnotationArgs,
  ManualPointEventAnnotationOutput
> = {
  name: 'manual_point_event_annotation',
  aliases: [],
  type: 'manual_point_event_annotation',
  help: i18n.translate('eventAnnotation.manualAnnotation.description', {
    defaultMessage: `Configure manual annotation`,
  }),
  inputTypes: ['null'],
  args: {
    id: {
      required: true,
      types: ['string'],
      help: i18n.translate('eventAnnotation.manualAnnotation.args.id', {
        defaultMessage: `Id for annotation`,
      }),
    },
    time: {
      types: ['string'],
      help: i18n.translate('eventAnnotation.manualAnnotation.args.time', {
        defaultMessage: `Timestamp for annotation`,
      }),
    },
    label: {
      types: ['string'],
      help: i18n.translate('eventAnnotation.manualAnnotation.args.label', {
        defaultMessage: `The name of the annotation`,
      }),
    },
    color: {
      types: ['string'],
      help: i18n.translate('eventAnnotation.manualAnnotation.args.color', {
        defaultMessage: 'The color of the line',
      }),
    },
    lineStyle: {
      types: ['string'],
      options: ['solid', 'dotted', 'dashed'],
      help: i18n.translate('eventAnnotation.manualAnnotation.args.lineStyle', {
        defaultMessage: 'The style of the annotation line',
      }),
    },
    lineWidth: {
      types: ['number'],
      help: i18n.translate('eventAnnotation.manualAnnotation.args.lineWidth', {
        defaultMessage: 'The width of the annotation line',
      }),
    },
    icon: {
      types: ['string'],
      help: i18n.translate('eventAnnotation.manualAnnotation.args.icon', {
        defaultMessage: 'An optional icon used for annotation lines',
      }),
      options: [...Object.values(AvailableAnnotationIcons)],
      strict: true,
    },
    textVisibility: {
      types: ['boolean'],
      help: i18n.translate('eventAnnotation.manualAnnotation.args.textVisibility', {
        defaultMessage: 'Visibility of the label on the annotation line',
      }),
    },
    isHidden: {
      types: ['boolean'],
      help: i18n.translate('eventAnnotation.manualAnnotation.args.isHidden', {
        defaultMessage: `Switch to hide annotation`,
      }),
    },
  },
  fn: function fn(input: unknown, args: ManualPointEventAnnotationArgs) {
    return {
      type: 'manual_point_event_annotation',
      ...args,
    };
  },
};

export const manualRangeEventAnnotation: ExpressionFunctionDefinition<
  'manual_range_event_annotation',
  null,
  ManualRangeEventAnnotationArgs,
  ManualRangeEventAnnotationOutput
> = {
  name: 'manual_range_event_annotation',
  aliases: [],
  type: 'manual_range_event_annotation',
  help: i18n.translate('eventAnnotation.rangeAnnotation.description', {
    defaultMessage: `Configure manual annotation`,
  }),
  inputTypes: ['null'],
  args: {
    id: {
      required: true,
      types: ['string'],
      help: i18n.translate('eventAnnotation.rangeAnnotation.args.id', {
        defaultMessage: `Id for annotation`,
      }),
    },
    time: {
      types: ['string'],
      help: i18n.translate('eventAnnotation.rangeAnnotation.args.time', {
        defaultMessage: `Timestamp for annotation`,
      }),
    },
    endTime: {
      types: ['string'],
      help: i18n.translate('eventAnnotation.rangeAnnotation.args.endTime', {
        defaultMessage: `Timestamp for range annotation`,
      }),
      required: false,
    },
    outside: {
      types: ['boolean'],
      help: '',
      required: false,
    },
    label: {
      types: ['string'],
      help: i18n.translate('eventAnnotation.rangeAnnotation.args.label', {
        defaultMessage: `The name of the annotation`,
      }),
    },
    color: {
      types: ['string'],
      help: i18n.translate('eventAnnotation.rangeAnnotation.args.color', {
        defaultMessage: 'The color of the line',
      }),
    },
    isHidden: {
      types: ['boolean'],
      help: i18n.translate('eventAnnotation.rangeAnnotation.args.isHidden', {
        defaultMessage: `Switch to hide annotation`,
      }),
    },
  },
  fn: function fn(input: unknown, args: ManualRangeEventAnnotationArgs) {
    return {
      type: 'manual_range_event_annotation',
      ...args,
    };
  },
};
