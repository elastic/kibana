/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { createGunzip } from 'zlib';
import { PassThrough } from 'stream';
import {
  createFilterStream,
  createSplitStream,
  createReplaceStream,
  createMapStream,
} from '@kbn/utils';
import { flow, pipe } from 'fp-ts/function';

import { RECORD_SEPARATOR } from './constants';

const match = (regExpF: () => RegExp) => (x: ArchiveRecord) => x.match(regExpF());
const anyCharButNotWhiteSpaces = (): RegExp => /[^\s]/;
const toBoolean = (x: RegExpMatchArray | null) => Boolean(x);
const getAllButNotWhiteSpaces = (x: ArchiveRecord) => {
  // console.log(`\nλjs [getAllButNotWhiteSpaces] x: \n\t${x}`);
  return pipe(x, match(anyCharButNotWhiteSpaces), toBoolean);
};
export type ArchiveRecord = string;
export function createParseArchiveStreams({ gzip = false } = {}) {
  return [
    gzip ? createGunzip() : new PassThrough(),
    createReplaceStream('\r\n', '\n'),
    createSplitStream(RECORD_SEPARATOR),
    createFilterStream<string>(getAllButNotWhiteSpaces),
    createMapStream<string>(flow((x: string) => x.trim(), JSON.parse.bind(JSON))),
  ];
}
