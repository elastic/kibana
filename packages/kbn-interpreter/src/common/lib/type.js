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

// All types must be universal and be castable on the client or on the server
import { get } from 'lodash';
import { getType } from './get_type';

// TODO: Currently all casting functions must be syncronous.

export function Type(config) {
  // Required
  this.name = config.name;

  // Optional
  this.help = config.help || ''; // A short help text

  // Optional type validation, useful for checking function output
  this.validate = config.validate || function validate() {};

  // Optional
  this.create = config.create;

  // Optional serialization (used when passing context around client/server)
  this.serialize = config.serialize;
  this.deserialize = config.deserialize;

  const getToFn = type => get(config, ['to', type]) || get(config, ['to', '*']);
  const getFromFn = type => get(config, ['from', type]) || get(config, ['from', '*']);

  this.castsTo = type => typeof getToFn(type) === 'function';
  this.castsFrom = type => typeof getFromFn(type) === 'function';

  this.to = (node, toTypeName, types) => {
    const typeName = getType(node);
    if (typeName !== this.name) {
      throw new Error(`Can not cast object of type '${typeName}' using '${this.name}'`);
    }
    else if (!this.castsTo(toTypeName)) {
      throw new Error(`Can not cast '${typeName}' to '${toTypeName}'`);
    }

    return getToFn(toTypeName)(node, types);
  };

  this.from = (node, types) => {
    const typeName = getType(node);
    if (!this.castsFrom(typeName)) throw new Error(`Can not cast '${this.name}' from ${typeName}`);

    return getFromFn(typeName)(node, types);
  };
}
