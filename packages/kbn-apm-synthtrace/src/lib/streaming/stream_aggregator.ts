/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { Client } from '@elastic/elasticsearch';
import { Fields } from '../../..';
import { Signal } from '../../dsl/signal';

export interface StreamAggregator<TFieldsIn extends Fields, TFields extends Fields> {
  name: string;

  process(event: TFieldsIn): Array<Signal<TFields>> | null;

  flush(): Array<Signal<TFields>>;

  bootstrapElasticsearch(esClient: Client): Promise<void>;

  getDataStreamName(): string;

  getDimensions(): string[];

  getMappings(): Record<string, any>;
}
