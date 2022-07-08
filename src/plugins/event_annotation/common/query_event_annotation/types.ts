/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Query } from '@kbn/es-query';
import { ExpressionValueBoxed } from '@kbn/expressions-plugin/common';
import { PointStyleProps } from '../types';

export type QueryPointEventAnnotationArgs = {
  field: string;
  textSource?: string;
  textField?: string;
  query: ExpressionValueBoxed<'kibana_query', Query>;
  additionalFields?: string[];
} & PointStyleProps;

export type QueryPointEventAnnotationOutput = QueryPointEventAnnotationArgs & {
  type: 'query_point_event_annotation';
};
