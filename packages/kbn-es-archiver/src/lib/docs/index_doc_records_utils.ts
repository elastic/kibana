/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Client } from '@elastic/elasticsearch';
import AggregateError from 'aggregate-error';
import { Stats } from '..';
import { ES_CLIENT_HEADERS } from '../../client_headers';
// eslint-disable-next-line @kbn/imports/no_boundary_crossing
import { cpuCount } from '../../../../../test/api_integration/apis/local_and_ess_is_es_archiver_slow/utils';

export function indexDocs(stats: Stats, client: Client, useCreate: boolean = false) {
  return async (
    jsonStanzasWithinArchive: any[],
    callerName: 'write' | 'writev' = 'write'
  ): Promise<void> => {
    const operation = useCreate ? 'create' : 'index';
    const ops = new WeakMap<any, any>();
    const errors: string[] = [];

    doStuff(client, jsonStanzasWithinArchive, ops, operation, errors);
    if (errors.length) throw new AggregateError(errors);

    for (const stanza of jsonStanzasWithinArchive)
      stats.indexedDoc(stanza.data_stream || stanza.index);
  };
}

const concurrencyMaxMinus1 = () => cpuCount() - 1;

interface TypeBase {
  source: any;
  id: any;
}
interface DataStreamType {
  data_stream: any;
}
interface IndexType {
  index: any;
}
type IndexOrDataStreamTypeButNotBoth = TypeBase & (DataStreamType | IndexType);

const doStuff = async (client, jsonStanzasWithinArchive, ops, operation, errors): Promise<void> => {
  await client.helpers.bulk(
    {
      // flushBytes: 10000000,
      // flushInterval: 10000,
      concurrency: concurrencyMaxMinus1(),
      retries: 3,
      datasource: jsonStanzasWithinArchive.map((doc) => {
        const body = doc.source;
        const index = doc.data_stream || doc.index;
        ops.set(body, {
          [operation]: {
            _index: index,
            _id: doc.id,
          },
        });
        return body;
      }),
      onDocument(doc: any) {
        return ops.get(doc);
      },
      onDrop(dropped: { document: any; error: any }): void {
        const dj = JSON.stringify(dropped.document);
        const ej = JSON.stringify(dropped.error);
        errors.push(`Bulk doc failure [operation=${operation}]:\n  doc: ${dj}\n  error: ${ej}`);
      },
    },
    {
      headers: ES_CLIENT_HEADERS,
    }
  );
};

type WorkType = 'write' | 'writev';
export const writeOrWriteV =
  (workType: WorkType) =>
  (indexHof: (arg0: any, arg1: string | undefined) => any) =>
  (callback: (arg0: null) => void) =>
  (progress: { addToComplete: (arg0: number) => any }) =>
  async (xs): Promise<void> => {
    try {
      workType === 'write'
        ? await indexHof(xs)
        : await indexHof(
            xs.map(({ chunk: record }) => record.value),
            'writev'
          );
      workType === 'write' ? progress.addToComplete(1) : progress.addToComplete(xs.length);

      callback(null);
    } catch (err) {
      callback(err);
    }
  };

// So the axiom held up in ci
// https://ci.ml-qa.com/blue/organizations/jenkins/dev%2Fes-archiver-benchmark/detail/es-archiver-benchmark/47/pipeline/45/
// But the sample size is small not highly varied compared to what's available in all the myriad
// FTR tests.
