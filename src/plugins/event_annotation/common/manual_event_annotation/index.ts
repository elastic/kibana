/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { ExpressionFunctionDefinition } from 'src/plugins/expressions/common';
import type { EventAnnotationArgs, EventAnnotationOutput } from './types';
export const manualEventAnnotation: ExpressionFunctionDefinition<
  'manual_event_annotation',
  null,
  EventAnnotationArgs,
  EventAnnotationOutput
> = {
  name: 'manual_event_annotation',
  aliases: [],
  type: 'manual_event_annotation',
  help: `Configure manual annotation`,
  inputTypes: ['null'],
  args: {
    time: {
      types: ['string'],
      help: 'Timestamp for annotation',
    },
    label: {
      types: ['string'],
      help: 'The name of the annotation',
    },
    color: {
      types: ['string'],
      help: 'The color of the line',
    },
    lineStyle: {
      types: ['string'],
      options: ['solid', 'dotted', 'dashed'],
      help: 'The style of the annotation line',
    },
    lineWidth: {
      types: ['number'],
      help: 'The width of the annotation line',
    },
    icon: {
      types: ['string'],
      help: 'An optional icon used for annotation lines',
    },
    iconPosition: {
      types: ['string'],
      options: ['auto', 'above', 'below', 'left', 'right'],
      help: 'The placement of the icon for the annotation line',
    },
    textVisibility: {
      types: ['boolean'],
      help: 'Visibility of the label on the annotation line',
    },
    isHidden: {
      types: ['boolean'],
      help: 'is hidden?',
    },
  },
  fn: function fn(input: unknown, args: EventAnnotationArgs) {
    return {
      type: 'manual_event_annotation',
      ...args,
    };
  },
};
