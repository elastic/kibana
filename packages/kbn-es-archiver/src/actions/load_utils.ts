/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { Client } from '@elastic/elasticsearch';

import { PassThrough, Readable } from 'stream';
import { concatStreamProviders } from '@kbn/utils';
import { prioritizeMappings, readDirectory } from '../lib';
import { ES_CLIENT_HEADERS } from '../client_headers';

type Arrow2Readable = () => Readable;
interface FX {
  (filename: string): Arrow2Readable;
  (value: string, index: number, array: string[]): Arrow2Readable;
}
export async function recordStream(streamFactoryFn: FX, inputDir: string): Promise<PassThrough> {
  return concatStreamProviders(
    prioritizeMappings(await readDirectory(inputDir)).map(streamFactoryFn),
    {
      objectMode: true,
    }
  );
}

export function docIndicesPushFactory(xs: string[]) {
  return function (idx: string) {
    xs.push(idx);
  };
}
export function atLeastOne(predicate: {
  (x: string): boolean;
  (value: string, index: number, array: string[]): unknown;
}) {
  return (result: {}) => Object.keys(result).some(predicate);
}
export function indexingOccurred(docs: { indexed: any; archived?: number }) {
  return docs && docs.indexed > 0;
}
export async function freshenUp(client: Client, indicesWithDocs: string[]): Promise<void> {
  await client.indices.refresh(
    {
      index: indicesWithDocs.join(','),
      allow_no_indices: true,
    },
    {
      headers: ES_CLIENT_HEADERS,
    }
  );
}
export function hasDotKibanaPrefix(mainSOIndex: string) {
  return (x: string) => x.startsWith(mainSOIndex);
}
