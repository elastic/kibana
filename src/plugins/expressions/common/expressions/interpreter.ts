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

import { get } from 'lodash';

function getType(node: any) {
  if (node == null) return 'null';
  if (typeof node === 'object') {
    if (!node.type) throw new Error('Objects must have a type property');
    return node.type;
  }
  return typeof node;
}

export function Type(this: any, config: any) {
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

  const getToFn = (type: any) => get(config, ['to', type]) || get(config, ['to', '*']);
  const getFromFn = (type: any) => get(config, ['from', type]) || get(config, ['from', '*']);

  this.castsTo = (type: any) => typeof getToFn(type) === 'function';
  this.castsFrom = (type: any) => typeof getFromFn(type) === 'function';

  this.to = (node: any, toTypeName: any, types: any) => {
    const typeName = getType(node);
    if (typeName !== this.name) {
      throw new Error(`Can not cast object of type '${typeName}' using '${this.name}'`);
    } else if (!this.castsTo(toTypeName)) {
      throw new Error(`Can not cast '${typeName}' to '${toTypeName}'`);
    }

    return (getToFn(toTypeName) as any)(node, types);
  };

  this.from = (node: any, types: any) => {
    const typeName = getType(node);
    if (!this.castsFrom(typeName)) throw new Error(`Can not cast '${this.name}' from ${typeName}`);

    return (getFromFn(typeName) as any)(node, types);
  };
}
