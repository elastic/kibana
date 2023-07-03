/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Stream from 'stream';
import { get, isEqual } from 'lodash';
import { AnyEvent } from './log_events';

/**
 * Matches error messages when clients connect via HTTP instead of HTTPS; see unit test for full message. Warning: this can change when Node
 * and its bundled OpenSSL binary are upgraded.
 */
const OPENSSL_GET_RECORD_REGEX = /ssl3_get_record:http/;

/**
 * Matches error messages when clients connect via HTTPS and Kibana doesn't trust the certificate; Warning: the exact errors are numerous and can change when Node
 * and its bundled OpenSSL binary are upgraded.
 */
const OPENSSL_READ_RECORD_REGEX = /ssl3_read_bytes:sslv3/;

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

// generic method to convert the given event into the log level provided
function downgradeIfErrorMessage(match: RegExp | string, level: string, event: AnyEvent) {
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
    tags: [level, 'connection'],
    data: errorMessage,
  };
}

export class LogInterceptor extends Stream.Transform {
  constructor() {
    super({
      readableObjectMode: true,
      writableObjectMode: true,
      // Ideally, the writer to this stream should handle the backpressure
      // and hold any writes until the 'drain' event is emitted.
      // More info: https://nodejs.org/docs/latest-v16.x/api/stream.html#writablewritechunk-encoding-callback
      //
      // However, the writer (@elastic/good) doesn't apply such control,
      // so we need to add extra room in this buffer to handle peaks.
      //
      // Note that, in objectMode, this number refers to the number of objects instead of the bytes.
      readableHighWaterMark: 1000,
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

  /**
   * When Kibana has HTTPS enabled, but a client tries to connect over HTTP,
   * the client gets an empty response and an error surfaces in the logs.
   * These logs are not useful unless you are trying to debug edge-case
   * behaviors.
   *
   *  For that reason, we downgrade this from error to debug level
   * See https://github.com/elastic/kibana/issues/77391
   *
   *  @param {object} - log event
   */
  downgradeIfHTTPWhenHTTPS(event: AnyEvent) {
    return downgradeIfErrorMessage(OPENSSL_GET_RECORD_REGEX, 'debug', event);
  }
  /**
   * When Kibana has HTTPS enabled and Kibana doesn't trust the certificate,
   * an error surfaces in the logs.
   * These error logs are not useful and can give the impression that
   * Kibana is doing something wrong when it's the client that's doing it wrong.
   *
   *  For that reason, we downgrade this from error to info level
   * See https://github.com/elastic/kibana/issues/35004
   *
   *  @param {object} - log event
   */
  downgradeIfCertUntrusted(event: AnyEvent) {
    return downgradeIfErrorMessage(OPENSSL_READ_RECORD_REGEX, 'info', event);
  }

  _transform(event: AnyEvent, enc: string, next: Stream.TransformCallback) {
    const downgraded =
      this.downgradeIfEconnreset(event) ||
      this.downgradeIfEpipe(event) ||
      this.downgradeIfEcanceled(event) ||
      this.downgradeIfHTTPSWhenHTTP(event) ||
      this.downgradeIfHTTPWhenHTTPS(event) ||
      this.downgradeIfCertUntrusted(event);

    this.push(downgraded || event);
    next();
  }
}
