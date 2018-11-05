/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EsClient } from '@code/esqueue';

import { Log } from '../log';

export class BatchIndexHelper {
  private batch: any[];

  constructor(
    private batchSize: number,
    protected readonly client: EsClient,
    protected readonly log: Log
  ) {
    this.batch = [];
  }

  public async index(index: string, type: string, id: string, body: any) {
    this.batch.push({
      index: {
        _index: index,
        _type: type,
        _id: id,
      },
    });
    this.batch.push(body);
    if (this.batch.length === this.batchSize * 2) {
      await this.flush();
    }
  }

  public async flush() {
    this.log.info(`Batch index ${this.batch.length / 2} documents.`);
    const res = await this.client.bulk({ body: this.batch });
    this.batch = [];
    return res;
  }
}
