/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import Stream from 'stream';
import { get, isEqual } from 'lodash';
import { AnyEvent } from './log_events';

/**
 * Matches error messages when clients connect via HTTP instead of HTTPS; see unit test for full message. Warning: this can change when Node
 * and its bundled OpenSSL binary are upgraded.
 */
const OPENSSL_GET_RECORD_REGEX = /ssl3_get_record:http/;

function doTagsMatch(event: AnyEvent, tags: string[]) {
  return isEqual(event.tags, tags);
}

function doesMessageMatch(errorMessage: string, match: RegExp | string) {
  if (!errorMessage) {
    return false;
  }
  if (match instanceof RegExp) {
    return match.test(errorMessage);
  }
  return errorMessage === match;
}

// converts the given event into a debug log if it's an error of the given type
function downgradeIfErrorType(errorType: string, event: AnyEvent) {
  const isClientError = doTagsMatch(event, ['connection', 'client', 'error']);
  if (!isClientError) {
    return null;
  }

  const matchesErrorType =
    get(event, 'error.code') === errorType || get(event, 'error.errno') === errorType;
  if (!matchesErrorType) {
    return null;
  }

  const errorTypeTag = errorType.toLowerCase();

  return {
    event: 'log',
    pid: event.pid,
    timestamp: event.timestamp,
    tags: ['debug', 'connection', errorTypeTag],
    data: `${errorType}: Socket was closed by the client (probably the browser) before it could be read completely`,
  };
}

function downgradeIfErrorMessage(match: RegExp | string, event: AnyEvent) {
  const isClientError = doTagsMatch(event, ['connection', 'client', 'error']);
  const errorMessage = get(event, 'error.message');
  const matchesErrorMessage = isClientError && doesMessageMatch(errorMessage, match);

  if (!matchesErrorMessage) {
    return null;
  }

  return {
    event: 'log',
    pid: event.pid,
    timestamp: event.timestamp,
    tags: ['debug', 'connection'],
    data: errorMessage,
  };
}

export class LogInterceptor extends Stream.Transform {
  constructor() {
    super({
      readableObjectMode: true,
      writableObjectMode: true,
    });
  }

  /**
   *  Since the upgrade to hapi 14, any socket read
   *  error is surfaced as a generic "client error"
   *  but "ECONNRESET" specifically is not useful for the
   *  logs unless you are trying to debug edge-case behaviors.
   *
   *  For that reason, we downgrade this from error to debug level
   *
   *  @param {object} - log event
   */
  downgradeIfEconnreset(event: AnyEvent) {
    return downgradeIfErrorType('ECONNRESET', event);
  }

  /**
   *  Since the upgrade to hapi 14, any socket write
   *  error is surfaced as a generic "client error"
   *  but "EPIPE" specifically is not useful for the
   *  logs unless you are trying to debug edge-case behaviors.
   *
   *  For that reason, we downgrade this from error to debug level
   *
   *  @param {object} - log event
   */
  downgradeIfEpipe(event: AnyEvent) {
    return downgradeIfErrorType('EPIPE', event);
  }

  /**
   *  Since the upgrade to hapi 14, any socket write
   *  error is surfaced as a generic "client error"
   *  but "ECANCELED" specifically is not useful for the
   *  logs unless you are trying to debug edge-case behaviors.
   *
   *  For that reason, we downgrade this from error to debug level
   *
   *  @param {object} - log event
   */
  downgradeIfEcanceled(event: AnyEvent) {
    return downgradeIfErrorType('ECANCELED', event);
  }

  downgradeIfHTTPSWhenHTTP(event: AnyEvent) {
    return downgradeIfErrorType('HPE_INVALID_METHOD', event);
  }

  downgradeIfHTTPWhenHTTPS(event: AnyEvent) {
    return downgradeIfErrorMessage(OPENSSL_GET_RECORD_REGEX, event);
  }

  _transform(event: AnyEvent, enc: string, next: Stream.TransformCallback) {
    const downgraded =
      this.downgradeIfEconnreset(event) ||
      this.downgradeIfEpipe(event) ||
      this.downgradeIfEcanceled(event) ||
      this.downgradeIfHTTPSWhenHTTP(event) ||
      this.downgradeIfHTTPWhenHTTPS(event);

    this.push(downgraded || event);
    next();
  }
}
