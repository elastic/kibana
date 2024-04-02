/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { promisify } from 'util';
import { Observable } from 'rxjs';
import { catchError, concatMap, finalize } from 'rxjs';
import { AnalyticsServiceStart, Logger } from '@kbn/core/server';
import { Stream, PassThrough } from 'stream';
import { constants, deflate } from 'zlib';
import { reportPerformanceMetricEvent } from '@kbn/ebt-tools';

const delimiter = '\n';
const pDeflate = promisify(deflate);

const BFETCH_SERVER_ENCODING_EVENT_TYPE = 'bfetch_server_encoding';
interface ZipStreamMetric {
  time: number;
  messageSize: number;
}

class StreamMetricCollector {
  private readonly _collector: ZipStreamMetric[] = [];
  addMetric(time: number, messageSize: number) {
    this._collector.push({ time, messageSize });
  }
  getEBTPerformanceMetricEvent() {
    let totalTime = 0;
    let totalMessageSize = 0;
    for (let i = 0; i < this._collector.length; i++) {
      totalTime += this._collector[i].time;
      totalMessageSize += this._collector[i].messageSize;
    }
    return {
      eventName: BFETCH_SERVER_ENCODING_EVENT_TYPE,
      duration: totalTime,
      key1: 'message_count',
      value1: this._collector.length,
      key2: 'total_byte_size',
      value2: totalMessageSize,
      key3: 'stream_type',
      value3: 1, // 1 == 'compressed'. Can always include support for ndjson-type later (e.g. 2 == ndjson)
    };
  }
}

async function zipMessageToStream(
  output: PassThrough,
  message: string,
  collector?: StreamMetricCollector
) {
  return new Promise(async (resolve, reject) => {
    try {
      const before = Date.now();
      const gzipped = await pDeflate(message, {
        flush: constants.Z_SYNC_FLUSH,
      });
      const base64Compressed = gzipped.toString('base64');
      const duration = Date.now() - before;
      if (collector) {
        // 1 ASCII character = 1 byte
        collector.addMetric(duration, base64Compressed.length);
      }
      output.write(base64Compressed);
      output.write(delimiter);
      resolve(undefined);
    } catch (err) {
      reject(err);
    }
  });
}

export const createCompressedStream = <Response>(
  results: Observable<Response>,
  logger: Logger,
  analyticsStart?: AnalyticsServiceStart
): Stream => {
  const output = new PassThrough();
  const metricCollector: StreamMetricCollector | undefined = analyticsStart
    ? new StreamMetricCollector()
    : undefined;

  results
    .pipe(
      concatMap((message: Response) => {
        const strMessage = JSON.stringify(message);
        return zipMessageToStream(output, strMessage, metricCollector);
      }),
      catchError((e) => {
        logger.error('Could not serialize or stream a message.');
        logger.error(e);
        throw e;
      }),
      finalize(() => {
        output.end();

        if (analyticsStart && metricCollector) {
          reportPerformanceMetricEvent(
            analyticsStart,
            metricCollector.getEBTPerformanceMetricEvent()
          );
        }
      })
    )
    .subscribe();

  return output;
};
