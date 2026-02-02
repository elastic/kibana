/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod/v4';
import {
  DataSetStepSchema,
  ElasticsearchStepSchema,
  HttpStepSchema,
  KibanaStepSchema,
  WaitStepSchema,
} from '../../../spec/schema';

export const GraphNodeSchema = z.object({
  id: z.string(),
  type: z.string(),
  stepId: z.string(),
  stepType: z.string(),
});

export const AtomicGraphNodeSchema = GraphNodeSchema.extend({
  id: z.string(),
  type: z.literal('atomic'),
  configuration: z.any(),
});
export type AtomicGraphNode = z.infer<typeof AtomicGraphNodeSchema>;

export const WaitGraphNodeSchema = GraphNodeSchema.extend({
  id: z.string(),
  type: z.literal('wait'),
  configuration: WaitStepSchema,
});
export type WaitGraphNode = z.infer<typeof WaitGraphNodeSchema>;

export const DataSetGraphNodeSchema = GraphNodeSchema.extend({
  id: z.string(),
  type: z.literal('data.set'),
  configuration: DataSetStepSchema,
});
export type DataSetGraphNode = z.infer<typeof DataSetGraphNodeSchema>;

export const HttpGraphNodeSchema = GraphNodeSchema.extend({
  id: z.string(),
  type: z.literal('http'),
  configuration: HttpStepSchema,
});
export type HttpGraphNode = z.infer<typeof HttpGraphNodeSchema>;

export const ElasticsearchGraphNodeSchema = GraphNodeSchema.extend({
  id: z.string(),
  type: z.string().refine((val) => val.startsWith('elasticsearch.'), {
    message: 'Elasticsearch graph node type must start with "elasticsearch."',
  }),
  configuration: ElasticsearchStepSchema,
});
export type ElasticsearchGraphNode = z.infer<typeof ElasticsearchGraphNodeSchema>;

export const KibanaGraphNodeSchema = GraphNodeSchema.extend({
  id: z.string(),
  type: z.string().refine((val) => val.startsWith('kibana.'), {
    message: 'Kibana graph node type must start with "kibana."',
  }),
  configuration: KibanaStepSchema,
});
export type KibanaGraphNode = z.infer<typeof KibanaGraphNodeSchema>;
