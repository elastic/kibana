/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export class EsEventStreamNames {
  public readonly base: string;
  public readonly dataStream: string;
  public readonly indexPattern: string;
  public readonly indexTemplate: string;

  constructor(baseName: string) {
    const EVENT_STREAM_SUFFIX = `-event-stream`;
    const dataStream = `${baseName}${EVENT_STREAM_SUFFIX}`;

    this.base = baseName;
    this.dataStream = dataStream;
    this.indexPattern = `${dataStream}*`;
    this.indexTemplate = `${dataStream}-template`;
  }
}
