/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import type { ExpressionFunctionDefinition } from '@kbn/expressions-plugin/common';
import type { PointStyleProps } from '@kbn/event-annotation-common';
import { queryPointEventAnnotation } from '../query_point_event_annotation';
import { manualRangeEventAnnotation } from '../manual_event_annotation';

export type EsqlEventAnnotationArgs = PointStyleProps & {
  id: string;
  query: string;
  timeField?: string;
  timeColumn: string;
  endTimeColumn?: string;
  textColumn?: string;
  extraColumns?: string[];
  outside?: boolean;
};

export type EsqlEventAnnotationOutput = EsqlEventAnnotationArgs & {
  type: 'esql_event_annotation';
};

export const esqlEventAnnotation: ExpressionFunctionDefinition<
  'esql_event_annotation',
  null,
  EsqlEventAnnotationArgs,
  EsqlEventAnnotationOutput
> = {
  name: 'esql_event_annotation',
  type: 'esql_event_annotation',
  inputTypes: ['null'],
  help: i18n.translate('eventAnnotation.esqlAnnotation.description', {
    defaultMessage: 'Configure an ES|QL annotation',
  }),
  args: {
    id: queryPointEventAnnotation.args.id,
    label: queryPointEventAnnotation.args.label,
    color: queryPointEventAnnotation.args.color,
    icon: queryPointEventAnnotation.args.icon,
    lineStyle: queryPointEventAnnotation.args.lineStyle,
    lineWidth: queryPointEventAnnotation.args.lineWidth,
    textVisibility: queryPointEventAnnotation.args.textVisibility,
    isHidden: queryPointEventAnnotation.args.isHidden,
    outside: manualRangeEventAnnotation.args.outside,
    query: {
      types: ['string'],
      required: true,
      help: i18n.translate('eventAnnotation.esqlAnnotation.queryDescription', {
        defaultMessage: 'The ES|QL query that returns annotation events',
      }),
    },
    timeField: {
      types: ['string'],
      help: i18n.translate('eventAnnotation.esqlAnnotation.timeFieldDescription', {
        defaultMessage: 'The source time field used to apply the chart time range',
      }),
    },
    timeColumn: {
      types: ['string'],
      required: true,
      help: i18n.translate('eventAnnotation.esqlAnnotation.timeColumnDescription', {
        defaultMessage: 'The result column containing event timestamps',
      }),
    },
    endTimeColumn: {
      types: ['string'],
      help: i18n.translate('eventAnnotation.esqlAnnotation.endTimeColumnDescription', {
        defaultMessage: 'The result column containing range end timestamps',
      }),
    },
    textColumn: {
      types: ['string'],
      help: i18n.translate('eventAnnotation.esqlAnnotation.textColumnDescription', {
        defaultMessage: 'The result column containing annotation text',
      }),
    },
    extraColumns: {
      types: ['string'],
      multi: true,
      help: i18n.translate('eventAnnotation.esqlAnnotation.extraColumnsDescription', {
        defaultMessage: 'The result columns to show in annotation tooltips',
      }),
    },
  },
  fn: (_input, args) => ({ ...args, type: 'esql_event_annotation' }),
};
