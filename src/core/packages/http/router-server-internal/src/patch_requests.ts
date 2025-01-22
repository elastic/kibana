/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// @ts-expect-error not in the definition file
import HapiRequest from '@hapi/hapi/lib/request.js';
import { IncomingMessage } from 'http';
import { inspect } from 'util';

export const patchRequest = () => {
  // HAPI request
  HapiRequest.prototype.toString = function () {
    return `[HAPI.Request method="${this.method}" url="${this.url}"]`;
  };

  HapiRequest.prototype.toJSON = function () {
    return {
      method: this.method,
      url: String(this.url),
    };
  };

  HapiRequest.prototype[inspect.custom] = function () {
    return this.toJSON();
  };

  // http.IncomingMessage
  const IncomingMessageProto = IncomingMessage.prototype;

  IncomingMessageProto.toString = function () {
    return `[http.IncomingMessage method="${this.method}" url="${this.url}" complete="${this.complete}" aborted="${this.aborted}"]`;
  };

  // @ts-expect-error missing definition
  IncomingMessageProto.toJSON = function () {
    return {
      method: this.method,
      url: this.url,
      complete: this.complete,
      aborted: this.aborted,
    };
  };

  // @ts-expect-error missing definition
  IncomingMessageProto[inspect.custom] = function () {
    // @ts-expect-error missing definition
    return this.toJSON();
  };
};
