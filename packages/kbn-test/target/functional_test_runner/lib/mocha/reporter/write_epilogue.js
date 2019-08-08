"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.writeEpilogue = writeEpilogue;

var colors = _interopRequireWildcard(require("./colors"));

var _ms = require("./ms");

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
function writeEpilogue(log, stats) {
  // header
  log.write(); // passes

  log.write(`${colors.pass('%d passing')} (%s)`, stats.passes || 0, (0, _ms.ms)(stats.duration)); // pending

  if (stats.pending) {
    log.write(colors.pending('%d pending'), stats.pending);
  } // failures


  if (stats.failures) {
    log.write('%d failing', stats.failures);
  } // footer


  log.write();
}