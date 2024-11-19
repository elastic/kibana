/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import http from 'http';
import https from 'https';
import http2 from 'http2';
import { getServerTLSOptions } from './get_tls_options';
import type { IHttpConfig, ServerListener } from './types';

interface GetServerListenerOptions {
  configureTLS?: boolean;
}

export function getServerListener(
  config: IHttpConfig,
  options: GetServerListenerOptions = {}
): ServerListener {
  const useHTTP2 = config.protocol === 'http2';
  return useHTTP2
    ? configureHttp2Listener(config, options)
    : configureHttp1Listener(config, options);
}

const configureHttp1Listener = (
  config: IHttpConfig,
  { configureTLS = true }: GetServerListenerOptions = {}
): ServerListener => {
  const useTLS = configureTLS && config.ssl.enabled;
  const tlsOptions = useTLS ? getServerTLSOptions(config.ssl) : undefined;

  const listener = useTLS
    ? https.createServer({
        ...tlsOptions,
        keepAliveTimeout: config.keepaliveTimeout,
      })
    : http.createServer({
        keepAliveTimeout: config.keepaliveTimeout,
      });

  listener.setTimeout(config.socketTimeout);
  listener.on('timeout', (socket) => {
    socket.destroy();
  });
  listener.on('clientError', (err, socket) => {
    if (socket.writable) {
      socket.end(Buffer.from('HTTP/1.1 400 Bad Request\r\n\r\n', 'ascii'));
    } else {
      socket.destroy(err);
    }
  });

  return listener;
};

const configureHttp2Listener = (
  config: IHttpConfig,
  { configureTLS = true }: GetServerListenerOptions = {}
): ServerListener => {
  const useTLS = configureTLS && config.ssl.enabled;
  const tlsOptions = useTLS ? getServerTLSOptions(config.ssl) : undefined;

  const listener = useTLS
    ? http2.createSecureServer({
        ...tlsOptions,
        // allow ALPN negotiation fallback to HTTP/1.x
        allowHTTP1: true,
      })
    : http2.createServer({});

  listener.setTimeout(config.socketTimeout);

  return listener;
};
