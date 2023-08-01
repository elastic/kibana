/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { createGunzip } from 'zlib';
import { PassThrough, Transform } from 'stream';
import {
  createFilterStream,
  createSplitStream,
  createReplaceStream,
  createMapStream,
} from '@kbn/utils';
import { pipe } from 'fp-ts/function';
/* eslint no-console: ["error",{ allow: ["log"] }] */

import { RECORD_SEPARATOR } from './constants';

const anyCharButNotWhiteSpaces = (): RegExp => /[^\s]/;
const toBoolean = (x: RegExpMatchArray | null) => Boolean(x);

// Passthrough extends Transform
// Transform extends Duplex
// Duplex extends Readable and
//   implements Writable

// TODO-TRE: This could be changed to
// do less?  Maybe?

// TODO-TRE: Is this a place to use a lib?
// Native streams "feel" faster / smarter / etc.  But not sure.

// export const streamXformations: (a: any) => Transform[] = ({ gzip = false } = {}) => {
interface Params {
  gzip?: boolean;
}
export const streamXformations = ({ gzip = false }: Params = {}): Transform[] => {
  console.log(`\nλjs gzip: \n\t${gzip}`);
  return [
    // Gunzip exteneds Stream.Transform
    gzip ? createGunzip() : new PassThrough(),
    createReplaceStream('\r\n', '\n'),
    createSplitStream(RECORD_SEPARATOR),
    createFilterStream<string>((a: string) =>
      pipe(a, (x) => x.match(anyCharButNotWhiteSpaces()), toBoolean)
    ),
    createMapStream<string>((json) => JSON.parse(json.trim())),
  ];
};

// TODO-TRE: This fn is a duplicate of the above.
// This one is used outside this module, so I'm leaving it olone for now (mostly).
export function createParseArchiveStreams({ gzip = false } = {}): Transform[] {
  return [
    // Gunzip exteneds Stream.Transform
    gzip ? createGunzip() : new PassThrough(),
    createReplaceStream('\r\n', '\n'),
    createSplitStream(RECORD_SEPARATOR),
    createFilterStream<string>((a: string) =>
      pipe(a, (x) => x.match(anyCharButNotWhiteSpaces()), toBoolean)
    ),
    createMapStream<string>((json) => JSON.parse(json.trim())),
  ];
}
