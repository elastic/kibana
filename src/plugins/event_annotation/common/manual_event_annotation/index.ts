/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { ExpressionFunctionDefinition } from 'src/plugins/expressions/common';
import { i18n } from '@kbn/i18n';
import type { EventAnnotationArgs, EventAnnotationOutput } from './types';
import { AvailableAnnotationIcons } from '../constants';

export const manualEventAnnotation: ExpressionFunctionDefinition<
  'manual_event_annotation',
  null,
  EventAnnotationArgs,
  EventAnnotationOutput
> = {
  name: 'manual_event_annotation',
  aliases: [],
  type: 'manual_event_annotation',
  help: i18n.translate('eventAnnotation.manualAnnotation.description', {
    defaultMessage: `Configure manual annotation`,
  }),
  inputTypes: ['null'],
  args: {
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
  fn(input: unknown, args: EventAnnotationArgs) {
    return {
      type: 'manual_event_annotation',
      ...args,
    };
  },
};
