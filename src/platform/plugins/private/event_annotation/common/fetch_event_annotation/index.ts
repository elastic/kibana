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
import type { EventAnnotationGroupOutput } from '../event_annotation_group';

export interface FetchEventAnnotationArgs {
  group: EventAnnotationGroupOutput[];
}

export type FetchEventAnnotationOutput = FetchEventAnnotationArgs & {
  type: 'fetch_event_annotation';
};

export function eventAnnotationGroup(): ExpressionFunctionDefinition<
  'fetch_event_annotation',
  null,
  FetchEventAnnotationArgs,
  FetchEventAnnotationOutput
> {
  return {
    name: 'fetch_event_annotation',
    aliases: [],
    type: 'fetch_event_annotation',
    inputTypes: ['null'],
    help: i18n.translate('eventAnnotation.fetch.description', {
      defaultMessage: 'Event annotation fetch',
    }),
    args: {
      group: {
        types: ['event_annotation_group'],
        help: i18n.translate('eventAnnotation.group.args.annotationGroups', {
          defaultMessage: 'Annotation group',
        }),
        multi: true,
      },
    },
    fn: (input, args) => {
      return {
        type: 'fetch_event_annotation',
        group: args.group,
      };
    },
  };
}
