/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

var EOL = require('os').EOL;

// Be very careful of what you add to this list. Idealy this array should be
// empty, but in certain circumstances, we can allow a warning to be ignored
// temporarily.
//
// Each element in the array is a "rule-object". All rules defined in a
// "rule-object" has to match for a warning to be ignored. Possible rules are:
// `name`, `code`, `message`, `file`, `lines`, and `col`.
//
// The `file`, `line`, and `col` rules will be checked against the top stack
// frame only. Also, `file` doesn't have to match the full path, only the end of
// it.
var IGNORE_WARNINGS = [
  {
    name: 'MaxListenersExceededWarning',
  },
  {
    name: 'DeprecationWarning',
    code: 'DEP0066',
    file: '/node_modules/supertest/node_modules/superagent/lib/node/index.js',
    line: 418,
  },
  // TODO @elastic/es-clients
  // 'Use of deprecated folder mapping "./" in the "exports" field module resolution of the package
  // at node_modules/@elastic/elasticsearch/package.json.'
  // This is a breaking change in Node 12, which elasticsearch-js supports.
  // https://github.com/elastic/elasticsearch-js/issues/1465
  // https://nodejs.org/api/deprecations.html#DEP0148
  {
    name: 'DeprecationWarning',
    code: 'DEP0148',
  },
  {
    // TODO: @elastic/es-clients - The new client will attempt a Product check and it will `process.emitWarning`
    //  that the security features are blocking such check.
    //  Such emit is causing Node.js to crash unless we explicitly catch it.
    //  We need to discard that warning
    name: 'ProductNotSupportedSecurityError',
  },
  // https://github.com/browserify/browserify-rsa/pull/20
  {
    name: 'DeprecationWarning',
    code: 'DEP0170',
    message:
      'The URL https://github.com:crypto-browserify/browserify-rsa.git is invalid. Future versions of Node.js will throw an error.',
  },
  // supertest in HTTP2 mode uses 0.0.0.0 as the server's name
  {
    name: 'DeprecationWarning',
    code: 'DEP0123',
    message:
      'Setting the TLS ServerName to an IP address is not permitted by RFC 6066. This will be ignored in a future version.',
  },
  {
    // emitted whenever a header not supported by http2 is set. it's not actionable for the end user.
    // HAPI sets a connection: close header - see https://github.com/hapijs/hapi/issues/3830
    name: 'UnsupportedWarning',
    messageContains:
      'header is not valid, the value will be dropped from the header and will never be in use.',
  },
  // We have to enabled NODE_TLS_REJECT_UNAUTHORIZED for FTR testing
  // when http2 is enabled to accept dev self-signed certificates
  {
    ftrOnly: true,
    name: 'Warning',
    message:
      "Setting the NODE_TLS_REJECT_UNAUTHORIZED environment variable to '0' makes TLS connections and HTTPS requests insecure by disabling certificate verification.",
  },
];

if (process.noProcessWarnings !== true) {
  process.on('warning', function (warn) {
    if (shouldIgnore(warn)) return;

    if (process.traceProcessWarnings === true) {
      console.error('Node.js process-warning detected - Terminating process...');
    } else {
      console.error('Node.js process-warning detected:');
      console.error();
      console.error(warn.stack);
      console.error();
      console.error('Terminating process...');
    }
    process.exit(1);
  });

  // While the above warning listener would also be called on
  // unhandledRejection warnings, we can give a better error message if we
  // handle them separately:
  process.on('unhandledRejection', function (reason) {
    console.error('Unhandled Promise rejection detected:');
    console.error();
    console.error(reason);
    console.error();
    console.error('Terminating process...');
    process.exit(1);
  });
}

function shouldIgnore(warn) {
  warn = parseWarn(warn);

  return IGNORE_WARNINGS.some(function ({
    name,
    code,
    message,
    messageContains,
    file,
    line,
    col,
    ftrOnly,
  }) {
    if (ftrOnly && !process.env.IS_FTR_RUNNER) return false;
    if (name && name !== warn.name) return false;
    if (code && code !== warn.code) return false;
    if (message && message !== warn.message) return false;
    if (messageContains && !warn.message.includes(messageContains)) return false;
    if (file && !warn.frames[0].file.endsWith(file)) return false;
    if (line && line !== warn.frames[0].line) return false;
    if (col && col !== warn.frames[0].col) return false;
    return true;
  });
}

function parseWarn(warn) {
  var lines = warn.stack.split(EOL);
  return {
    name: warn.name,
    code: warn.code,
    message: lines[0].split(': ')[1],
    frames: parseStack(lines.slice(1)),
  };
}

function parseStack(stack) {
  return stack.map(parseFrame).filter(function (frame) {
    return frame;
  });
}

function parseFrame(frame) {
  // supports the following frame types:
  // - "    at function-name (file-path:1:2)"
  // - "    at function-name (file-path)"
  // - "    at file-path:1:2"
  var match = frame.match(/^    at (?:([^(]+) )?\(?([^:)]+)(?::(\d+):(\d+))?\)?$/);
  if (match === null) return; // in case the stack trace is modified by another module, e.g. jest
  return {
    func: match[1],
    file: match[2],
    line: Number(match[3]),
    col: Number(match[4]),
  };
}
