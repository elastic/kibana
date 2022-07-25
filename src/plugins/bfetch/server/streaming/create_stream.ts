/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Logger } from '@kbn/core/server';
import { Stream } from 'stream';
import { Observable } from 'rxjs';
import { createCompressedStream } from './create_compressed_stream';
import { createNDJSONStream } from './create_ndjson_stream';

export function createStream<Payload, Response>(
  response$: Observable<Response>,
  logger: Logger,
  compress: boolean
): Stream {
  return compress
    ? createCompressedStream(response$, logger)
    : createNDJSONStream(response$, logger);
}
