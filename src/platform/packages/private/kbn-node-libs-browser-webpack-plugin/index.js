/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/** @typedef {import('webpack').Compiler} WebpackCompiler */

/* eslint-disable import/no-extraneous-dependencies */
// @ts-expect-error
const nodeLibsBrowser = require('node-libs-browser');

const NodeLibsBrowserPlugin = class NodeLibsBrowserPlugin {
  /**
   * @param {WebpackCompiler} compiler
   */
  apply(compiler) {
    compiler.options.plugins.push(
      new compiler.webpack.ProvidePlugin({
        Buffer: [nodeLibsBrowser.buffer, 'Buffer'],
        console: nodeLibsBrowser.console,
        process: nodeLibsBrowser.process,
      })
    );

    compiler.options.resolve.fallback = {
      assert: nodeLibsBrowser.assert,
      buffer: nodeLibsBrowser.buffer,
      child_process: false,
      cluster: false,
      console: false,
      constants: nodeLibsBrowser.constants,
      crypto: nodeLibsBrowser.crypto,
      dgram: false,
      dns: false,
      domain: nodeLibsBrowser.domain,
      events: nodeLibsBrowser.events,
      fs: false,
      http: nodeLibsBrowser.http,
      https: nodeLibsBrowser.https,
      module: false,
      net: false,
      os: nodeLibsBrowser.os,
      path: nodeLibsBrowser.path,
      punycode: nodeLibsBrowser.punycode,
      process: nodeLibsBrowser.process,
      querystring: nodeLibsBrowser.querystring,
      readline: false,
      repl: false,
      stream: nodeLibsBrowser.stream,
      _stream_duplex: nodeLibsBrowser._stream_duplex,
      _stream_passthrough: nodeLibsBrowser._stream_passthrough,
      _stream_readable: nodeLibsBrowser._stream_readable,
      _stream_transform: nodeLibsBrowser._stream_transform,
      _stream_writable: nodeLibsBrowser._stream_writable,
      string_decoder: nodeLibsBrowser.string_decoder,
      sys: nodeLibsBrowser.sys,
      timers: nodeLibsBrowser.timers,
      tls: false,
      tty: nodeLibsBrowser.tty,
      url: nodeLibsBrowser.url,
      util: nodeLibsBrowser.util,
      vm: nodeLibsBrowser.vm,
      zlib: nodeLibsBrowser.zlib,
      ...compiler.options.resolve.fallback,
    };
  }
};

module.exports = {
  NodeLibsBrowserPlugin,
};
