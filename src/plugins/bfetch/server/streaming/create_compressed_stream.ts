/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { promisify } from 'util';
import { Observable } from 'rxjs';
import { catchError, concatMap, finalize } from 'rxjs';
import { AnalyticsServiceStart, Logger } from '@kbn/core/server';
import { Stream, PassThrough } from 'stream';
import { constants, deflate } from 'zlib';
import { reportPerformanceMetricEvent } from '@kbn/ebt-tools';
import { SerializableRecord } from '@kbn/utility-types';
import { IncomingMessage } from 'http';

const delimiter = '\n';
const pDeflate = promisify(deflate);

const BFETCH_SERVER_ENCODING_EVENT_TYPE = 'bfetch_server_encoding';

class StreamMetricCollector {
  private readonly _collector: number[] = [];
  addMetric(time: number, messageSize: number) {
    this._collector.push(time);
    this._collector.push(messageSize);
  }
  getEBTPerformanceMetricEvent() {
    let totalTime = 0;
    let totalMessageSize = 0;
    for (let i = 0; i < this._collector.length; i += 2) {
      totalTime += this._collector[i];
      totalMessageSize += this._collector[i + 1];
    }
    return {
      eventName: BFETCH_SERVER_ENCODING_EVENT_TYPE,
      duration: totalTime,
      key1: 'message_count',
      value1: this._collector.length / 2,
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
      const before = performance.now();
      const gzipped = await pDeflate(message, {
        flush: constants.Z_SYNC_FLUSH,
      });
      const base64Compressed = gzipped.toString('base64');
      if (collector) {
        // 1 ASCII character = 1 byte
        collector.addMetric(performance.now() - before, base64Compressed.length);
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
        const rawResponse = (message as SerializableRecord).result?.rawResponse as IncomingMessage;
        if (rawResponse && rawResponse.pipe) {
          let body = '';
          // Collect data from the stream
          const streamPromise = new Promise<void>((resolve, reject) => {
            rawResponse.on('data', (chunk) => {
              body += chunk.toString(); // Append incoming data chunks
            });

            rawResponse.on('end', () => {
              const result = JSON.parse(body);
              const newMessage = { ...message, result };
              const newLine = JSON.stringify(newMessage);
              zipMessageToStream(output, newLine, metricCollector).then((value) => {
                resolve(value);
              });
            });

            rawResponse.on('error', (e) => {
              reject(e);
            });
          });

          return streamPromise;
        } else {
          const strMessage = JSON.stringify(message);
          return zipMessageToStream(output, strMessage, metricCollector);
        }
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
