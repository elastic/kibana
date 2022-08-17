/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { KibanaQueryOutput } from '@kbn/data-plugin/common';
import { PointStyleProps } from '../types';

export type QueryEventAnnotationArgs = {
  id: string;
  filter: KibanaQueryOutput;
  timeField: string;
  fields?: string[];
} & PointStyleProps;

export type QueryEventAnnotationOutput = QueryEventAnnotationArgs & {
  type: 'query_event_annotation';
};
