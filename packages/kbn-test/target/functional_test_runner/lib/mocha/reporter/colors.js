"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.speed = speed;
exports.fail = exports.pass = exports.pending = exports.suite = void 0;

var _chalk = require("chalk");

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
const suite = _chalk.bold;
exports.suite = suite;
const pending = _chalk.cyan;
exports.pending = pending;
const pass = _chalk.green;
exports.pass = pass;
const fail = _chalk.red;
exports.fail = fail;

function speed(name, txt) {
  switch (name) {
    case 'fast':
      return (0, _chalk.green)(txt);

    case 'medium':
      return (0, _chalk.yellow)(txt);

    case 'slow':
      return (0, _chalk.red)(txt);

    default:
      return (0, _chalk.dim)(txt);
  }
}