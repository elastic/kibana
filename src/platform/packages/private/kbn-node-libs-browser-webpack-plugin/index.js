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
const nodeStdlibBrowser = require('node-stdlib-browser');

/**
 * @param {string} pkgName
 * @returns {string}
 */
const getStdLibBrowserPackage = (pkgName) => {
  // @ts-expect-error
  return require.resolve(nodeStdlibBrowser[pkgName]);
};

const NodeLibsBrowserPlugin = class NodeLibsBrowserPlugin {
  /**
   * @param {WebpackCompiler} compiler
   */
  apply(compiler) {
    compiler.options.plugins.push(
      new compiler.webpack.ProvidePlugin({
        Buffer: [getStdLibBrowserPackage('buffer'), 'Buffer'],
        console: getStdLibBrowserPackage('console'),
        process: getStdLibBrowserPackage('process'),
      })
    );

    compiler.options.resolve.fallback = {
      assert: getStdLibBrowserPackage('assert'),
      buffer: getStdLibBrowserPackage('buffer'),
      child_process: false,
      cluster: false,
      console: false,
      constants: getStdLibBrowserPackage('constants'),
      crypto: getStdLibBrowserPackage('crypto'),
      dgram: false,
      dns: false,
      domain: getStdLibBrowserPackage('domain'),
      events: getStdLibBrowserPackage('events'),
      fs: false,
      http: getStdLibBrowserPackage('http'),
      https: getStdLibBrowserPackage('https'),
      module: false,
      net: false,
      os: getStdLibBrowserPackage('os'),
      path: getStdLibBrowserPackage('path'),
      punycode: getStdLibBrowserPackage('punycode'),
      process: getStdLibBrowserPackage('process'),
      querystring: getStdLibBrowserPackage('querystring'),
      readline: false,
      repl: false,
      stream: getStdLibBrowserPackage('stream'),
      _stream_duplex: getStdLibBrowserPackage('_stream_duplex'),
      _stream_passthrough: getStdLibBrowserPackage('_stream_passthrough'),
      _stream_readable: getStdLibBrowserPackage('_stream_readable'),
      _stream_transform: getStdLibBrowserPackage('_stream_transform'),
      _stream_writable: getStdLibBrowserPackage('_stream_writable'),
      string_decoder: getStdLibBrowserPackage('string_decoder'),
      sys: getStdLibBrowserPackage('sys'),
      timers: getStdLibBrowserPackage('timers'),
      tls: false,
      tty: getStdLibBrowserPackage('tty'),
      url: getStdLibBrowserPackage('url'),
      util: getStdLibBrowserPackage('util'),
      vm: getStdLibBrowserPackage('vm'),
      zlib: getStdLibBrowserPackage('zlib'),
      ...compiler.options.resolve.fallback,
    };
  }
};

module.exports = {
  NodeLibsBrowserPlugin,
};
