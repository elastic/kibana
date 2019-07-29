"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.observeLines = observeLines;

var Rx = _interopRequireWildcard(require("rxjs"));

var _operators = require("rxjs/operators");

var _observe_readable = require("./observe_readable");

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) { var desc = Object.defineProperty && Object.getOwnPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : {}; if (desc.get || desc.set) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } } newObj.default = obj; return newObj; } }

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
const SEP = /\r?\n/;

/**
 *  Creates an Observable from a Readable Stream that:
 *   - splits data from `readable` into lines
 *   - completes when `readable` emits "end"
 *   - fails if `readable` emits "errors"
 *
 *  @param  {ReadableStream} readable
 *  @return {Rx.Observable}
 */
function observeLines(readable) {
  const done$ = (0, _observe_readable.observeReadable)(readable).pipe((0, _operators.share)());
  const scan$ = Rx.fromEvent(readable, 'data').pipe((0, _operators.scan)(({
    buffer
  }, chunk) => {
    buffer += chunk;
    let match;
    const lines = [];

    while (match = buffer.match(SEP)) {
      lines.push(buffer.slice(0, match.index));
      buffer = buffer.slice(match.index + match[0].length);
    }

    return {
      buffer,
      lines
    };
  }, {
    buffer: ''
  }), // stop if done completes or errors
  (0, _operators.takeUntil)(done$.pipe((0, _operators.materialize)())));
  return Rx.merge( // use done$ to provide completion/errors
  done$, // merge in the "lines" from each step
  scan$.pipe((0, _operators.mergeMap)(({
    lines
  }) => lines)), // inject the "unsplit" data at the end
  scan$.pipe((0, _operators.last)(), (0, _operators.mergeMap)(({
    buffer
  }) => buffer ? [buffer] : []), // if there were no lines, last() will error, so catch and complete
  (0, _operators.catchError)(() => Rx.empty())));
}