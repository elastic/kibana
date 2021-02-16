/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
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
