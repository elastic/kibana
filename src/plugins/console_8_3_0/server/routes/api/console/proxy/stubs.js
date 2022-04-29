"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.createResponseStub = createResponseStub;

var _stream = require("stream");

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
function createResponseStub(response) {
  const resp = new _stream.Readable({
    read() {
      if (response) {
        this.push(response);
      }

      this.push(null);
    }

  });
  resp.statusCode = 200;
  resp.statusMessage = 'OK';
  resp.headers = {
    'content-type': 'text/plain',
    'content-length': String(response ? response.length : 0)
  };
  return resp;
}