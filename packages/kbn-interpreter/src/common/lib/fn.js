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

import { mapValues, includes } from 'lodash';
import { Arg } from './arg';

export function Fn(config) {
  // Required
  this.name = config.name; // Name of function

  // Return type of function.
  // This SHOULD be supplied. We use it for UI and autocomplete hinting,
  // We may also use it for optimizations in the future.
  this.type = config.type;
  this.aliases = config.aliases || [];

  // Function to run function (context, args)
  this.fn = (...args) => Promise.resolve(config.fn(...args));

  // Optional
  this.help = config.help || ''; // A short help text
  this.args = mapValues(config.args || {}, (arg, name) => new Arg({ name, ...arg }));

  this.context = config.context || {};

  this.accepts = (type) => {
    if (!this.context.types) return true; // If you don't tell us about context, we'll assume you don't care what you get
    return includes(this.context.types, type); // Otherwise, check it
  };
}
