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

import chalk from 'chalk';

export const pipe = (...fns) => fns.reduce((f, g) => (...args) => g(f(...args)));
export const noop = () => {};
export const green = (x) => chalk.greenBright.bold(x);
export const pink = (x) => chalk.bgMagenta.bold.cyan.bold(x);
export const id = (x) => x;
export const always = (x) => () => x; // Wraps a value in a fn. Eager evaluation if passed a fn.
export const pretty = (x) => JSON.stringify(x, null, 2);
export const reThrow = (e) => {
  throw e;
};
