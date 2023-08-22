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
import { pipe } from 'fp-ts/function';

import { RECORD_SEPARATOR } from './constants';

const anyCharButNotWhiteSpaces = (): RegExp => /[^\s]/;
const toBoolean = (x: RegExpMatchArray | null) => Boolean(x);

export function createParseArchiveStreams({ gzip = false } = {}) {
  const getAllButNotWhiteSpaces = (x) => pipe(x, match(anyCharButNotWhiteSpaces), toBoolean);
  return [
    gzip ? createGunzip() : new PassThrough(),
    createReplaceStream('\r\n', '\n'),
    createSplitStream(RECORD_SEPARATOR),
    createFilterStream<string>(getAllButNotWhiteSpaces),
    createMapStream<string>((json) => JSON.parse(json.trim())),
  ];
}

function match(predicate) {
  return (x) => x.match(predicate());
}
