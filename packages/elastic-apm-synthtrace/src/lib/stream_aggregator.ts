/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { Client } from '@elastic/elasticsearch';
import { ApmFields, Fields } from '..';

export interface StreamAggregator<TFields extends Fields = ApmFields> {
  name: string;

  getWriteTarget(document: Record<string, any>): string | null;

  process(event: TFields): Fields[] | null;

  flush(): Fields[];

  bootstrapElasticsearch(esClient: Client): Promise<void>;

  getDataStreamName(): string;

  getDimensions(): string[];

  getMappings(): Record<string, any>;
}
