/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { ExpressionFunctionDefinition } from '@kbn/expressions-plugin/common';
import { i18n } from '@kbn/i18n';
import { IndexPatternExpressionType } from '@kbn/data-views-plugin/common';
import type { EventAnnotationOutput } from '../manual_event_annotation/types';

export interface EventAnnotationGroupOutput {
  type: 'event_annotation_group';
  annotations: EventAnnotationOutput[];
  index?: IndexPatternExpressionType;
}

export interface EventAnnotationGroupArgs {
  annotations: EventAnnotationOutput[];
  index?: IndexPatternExpressionType;
}

export function eventAnnotationGroup(): ExpressionFunctionDefinition<
  'event_annotation_group',
  null,
  EventAnnotationGroupArgs,
  EventAnnotationGroupOutput
> {
  return {
    name: 'event_annotation_group',
    aliases: [],
    type: 'event_annotation_group',
    inputTypes: ['null'],
    help: i18n.translate('eventAnnotation.group.description', {
      defaultMessage: 'Event annotation group',
    }),
    args: {
      index: {
        types: ['index_pattern'],
        required: false,
        help: i18n.translate('eventAnnotation.group.args.annotationConfigs.index.help', {
          defaultMessage: 'Data view retrieved with indexPatternLoad',
        }),
      },
      annotations: {
        types: ['manual_point_event_annotation', 'manual_range_event_annotation'],
        help: i18n.translate('eventAnnotation.group.args.annotationConfigs', {
          defaultMessage: 'Annotation configs',
        }),
        multi: true,
      },
    },
    fn: (input, args) => {
      return {
        type: 'event_annotation_group',
        annotations: args.annotations,
        index: args.index,
      };
    },
  };
}
