/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { ExpressionFunctionDefinition } from '@kbn/expressions-plugin/common';
import { i18n } from '@kbn/i18n';
import { AvailableAnnotationIcons } from '../constants';
import type { QueryPointEventAnnotationArgs, QueryPointEventAnnotationOutput } from './types';

export const queryPointEventAnnotation: ExpressionFunctionDefinition<
  'query_point_event_annotation',
  null,
  QueryPointEventAnnotationArgs,
  QueryPointEventAnnotationOutput
> = {
  name: 'query_point_event_annotation',
  aliases: [],
  type: 'query_point_event_annotation',
  help: i18n.translate('eventAnnotation.queryAnnotation.description', {
    defaultMessage: `Configure query annotation`,
  }),
  inputTypes: ['null'],
  args: {
    field: {
      types: ['string'],
      help: i18n.translate('eventAnnotation.queryAnnotation.args.field', {
        defaultMessage: `The time field chosen for annotation`,
      }),
    },
    label: {
      types: ['string'],
      help: i18n.translate('eventAnnotation.queryAnnotation.args.label', {
        defaultMessage: `The name of the annotation`,
      }),
    },
    color: {
      types: ['string'],
      help: i18n.translate('eventAnnotation.queryAnnotation.args.color', {
        defaultMessage: 'The color of the line',
      }),
    },
    lineStyle: {
      types: ['string'],
      options: ['solid', 'dotted', 'dashed'],
      help: i18n.translate('eventAnnotation.queryAnnotation.args.lineStyle', {
        defaultMessage: 'The style of the annotation line',
      }),
    },
    lineWidth: {
      types: ['number'],
      help: i18n.translate('eventAnnotation.queryAnnotation.args.lineWidth', {
        defaultMessage: 'The width of the annotation line',
      }),
    },
    icon: {
      types: ['string'],
      help: i18n.translate('eventAnnotation.queryAnnotation.args.icon', {
        defaultMessage: 'An optional icon used for annotation lines',
      }),
      options: [...Object.values(AvailableAnnotationIcons)],
      strict: true,
    },
    textVisibility: {
      types: ['boolean'],
      help: i18n.translate('eventAnnotation.queryAnnotation.args.textVisibility', {
        defaultMessage: 'Visibility of the label on the annotation line',
      }),
    },
    textSource: {
      types: ['string'],
      options: ['name', 'field'],
      help: i18n.translate('eventAnnotation.queryAnnotation.args.textSource', {
        defaultMessage: `Source of annotation label`,
      }),
    },
    textField: {
      types: ['string'],
      help: i18n.translate('eventAnnotation.queryAnnotation.args.textField', {
        defaultMessage: `Field name used for the annotation label`,
      }),
    },
    isHidden: {
      types: ['boolean'],
      help: i18n.translate('eventAnnotation.queryAnnotation.args.isHidden', {
        defaultMessage: `Switch to hide annotation`,
      }),
    },
    query: {
      types: ['kibana_query'],
      help: i18n.translate('eventAnnotation.queryAnnotation.args.query', {
        defaultMessage: ``,
      }),
    },
    additionalFields: {
      types: ['string'],
      help: i18n.translate('eventAnnotation.queryAnnotation.args.query', {
        defaultMessage: ``,
      }),
      multi: true,
    },
  },
  fn: function fn(input: unknown, args: QueryPointEventAnnotationArgs) {
    return {
      type: 'query_point_event_annotation',
      ...args,
    };
  },
};
