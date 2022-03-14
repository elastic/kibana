/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { ExpressionFunctionDefinition } from 'src/plugins/expressions/common';
import { AnnotationConfig, AnnotationResult, AnnotationKey, AnnotationKeyResult } from './types';

export const annotationConfig: ExpressionFunctionDefinition<
  'annotation_config',
  null,
  AnnotationConfig,
  AnnotationResult
> = {
  name: 'annotation_config',
  aliases: [],
  type: 'annotation_config',
  help: `Configure annotation`,
  inputTypes: ['null'],
  args: {
    annotationType: {
      types: ['string'],
      help: 'Annotation type manual or query based',
    },
    key: {
      types: ['annotation_key'],
      help: 'Type specific config',
    },
    id: {
      types: ['string'],
      help: 'The accessor this configuration is for',
    },
    color: {
      types: ['string'],
      help: 'The color of the series',
    },
    label: {
      types: ['string'],
      help: 'The name',
    },
    isHidden: {
      types: ['boolean'],
      help: 'is hidden?',
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
    message: {
      types: ['string'],
      help: 'The tooltip message',
    },
    axisMode: {
      types: ['string'],
      options: ['bottom', 'auto', 'right', 'left'],
      help: 'Axis mode',
    },
  },
  fn: function fn(input: unknown, args: AnnotationConfig) {
    return {
      type: 'annotation_config',
      ...args,
    };
  },
};

export const annotationKeyConfig: ExpressionFunctionDefinition<
  'annotation_key',
  null,
  AnnotationKey,
  AnnotationKeyResult
> = {
  name: 'annotation_key',
  aliases: [],
  type: 'annotation_key',
  help: `Configure annotation`,
  inputTypes: ['null'],
  args: {
    keyType: {
      types: ['string'],
      options: ['point_in_time'],
      help: '',
    },
    timestamp: {
      types: ['number'],
      help: '',
    },
  },
  fn: function fn(input: unknown, args: AnnotationKey) {
    return {
      type: 'annotation_key',
      ...args,
    };
  },
};
