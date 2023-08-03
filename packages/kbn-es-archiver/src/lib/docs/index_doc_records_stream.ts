/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/* eslint no-console: ["error",{ allow: ["log"] }] */

import type { Client } from '@elastic/elasticsearch';
import { Writable } from 'stream';
import { opendirSync } from 'fs';
import { isGzip } from '..';
import { Stats } from '../stats';
import { Progress } from '../progress';
import { indexDocs, writeOrWriteV } from './index_doc_records_utils';

const isCompressed = (x: string): boolean => {
  const opened = opendirSync(x);
  const dirent = opened.readSync();
  // @ts-ignore
  const isIt: boolean = isGzip(dirent?.name);
  opened.closeSync();
  return isIt;
};
export function createIndexDocRecordsStream(
  client: Client,
  stats: Stats,
  progress: Progress,
  useCreate: boolean = false,
  inputDir: string
): Writable {
  return new Writable({
    highWaterMark: isCompressed(inputDir) ? 5000 : 300,
    objectMode: true,

    async write(record, enc, callback): Promise<void> {
      await writeOrWriteV('write')(indexDocs(stats, client, useCreate))(callback)(progress)([
        record.value,
      ]);
    },
    async writev(chunks, callback): Promise<void> {
      await writeOrWriteV('writev')(indexDocs(stats, client, useCreate))(callback)(progress)(
        chunks
      );
    },
  });
}
