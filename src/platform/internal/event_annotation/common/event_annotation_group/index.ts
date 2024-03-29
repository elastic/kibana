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
import type { EventAnnotationOutput } from '../types';

export interface EventAnnotationGroupOutput {
  type: 'event_annotation_group';
  annotations: EventAnnotationOutput[];
  ignoreGlobalFilters: boolean;
  dataView: IndexPatternExpressionType;
}

export interface EventAnnotationGroupArgs {
  annotations: EventAnnotationOutput[];
  dataView: IndexPatternExpressionType;
  ignoreGlobalFilters: boolean;
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
      dataView: {
        types: ['index_pattern'],
        required: true,
        help: i18n.translate('eventAnnotation.group.args.annotationConfigs.dataView.help', {
          defaultMessage: 'Data view retrieved with indexPatternLoad',
        }),
      },
      ignoreGlobalFilters: {
        types: ['boolean'],
        default: true,
        help: i18n.translate(
          'eventAnnotation.group.args.annotationConfigs.ignoreGlobalFilters.help',
          {
            defaultMessage: `Switch to ignore global filters for the annotation`,
          }
        ),
      },
      annotations: {
        types: [
          'manual_point_event_annotation',
          'manual_range_event_annotation',
          'query_point_event_annotation',
        ],
        help: i18n.translate('eventAnnotation.group.args.annotationConfigs', {
          defaultMessage: 'Annotation configs',
        }),
        required: true,
        multi: true,
      },
    },
    fn: (input, args) => {
      return {
        type: 'event_annotation_group',
        annotations: args.annotations.filter((annotation) => !annotation.isHidden),
        dataView: args.dataView,
        ignoreGlobalFilters: args.ignoreGlobalFilters,
      };
    },
  };
}
