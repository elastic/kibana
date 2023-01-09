/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { KibanaQueryOutput } from '@kbn/data-plugin/common';
import { PointStyleProps } from '../types';

export type QueryPointEventAnnotationArgs = {
  id: string;
  filter: KibanaQueryOutput;
  timeField?: string;
  extraFields?: string[];
  textField?: string;
} & PointStyleProps;

export type QueryPointEventAnnotationOutput = QueryPointEventAnnotationArgs & {
  type: 'query_point_event_annotation';
};
