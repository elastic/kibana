/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { IndicesGetDataStreamResponse } from '@elastic/elasticsearch/lib/api/types';

export class DataStream {
  private dataStreams: string[] = [];

  public perDataStreamIndices: Record<string, string[]> = {};

  getDataStreams = (): string[] => {
    return [...this.dataStreams];
  };

  loadDataStreams = (dataStreams: IndicesGetDataStreamResponse) => {
    this.dataStreams = (dataStreams.data_streams ?? []).map(({ name }) => name).sort();

    this.perDataStreamIndices = dataStreams.data_streams.reduce((acc, { name, indices }) => {
      acc[name] = indices.map((index) => index.index_name);
      return acc;
    }, {} as Record<string, string[]>);
  };

  clearDataStreams = () => {
    this.dataStreams = [];
  };
}
