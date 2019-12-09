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

import { get, identity } from 'lodash';
import { AnyExpressionType, ExpressionValue } from './types';

export function getType(node: any) {
  if (node == null) return 'null';
  if (typeof node === 'object') {
    if (!node.type) throw new Error('Objects must have a type property');
    return node.type;
  }
  return typeof node;
}

export function serializeProvider(types: any) {
  return {
    serialize: provider('serialize'),
    deserialize: provider('deserialize'),
  };

  function provider(key: any) {
    return (context: any) => {
      const type = getType(context);
      const typeDef = types[type];
      const fn: any = get(typeDef, key) || identity;
      return fn(context);
    };
  }
}

export class Type {
  name: string;

  /**
   * A short help text.
   */
  help: string;

  /**
   * Type validation, useful for checking function output.
   */
  validate: (type: any) => void | Error;

  create: unknown;

  /**
   * Optional serialization (used when passing context around client/server).
   */
  serialize?: (value: ExpressionValue) => any;
  deserialize?: (serialized: any) => ExpressionValue;

  constructor(private readonly config: AnyExpressionType) {
    const { name, help, deserialize, serialize, validate } = config;

    this.name = name;
    this.help = help || '';
    this.validate = validate || (() => {});

    // Optional
    this.create = (config as any).create;

    this.serialize = serialize;
    this.deserialize = deserialize;
  }

  getToFn = (value: any) => get(this.config, ['to', value]) || get(this.config, ['to', '*']);
  getFromFn = (value: any) => get(this.config, ['from', value]) || get(this.config, ['from', '*']);

  castsTo = (value: any) => typeof this.getToFn(value) === 'function';
  castsFrom = (value: any) => typeof this.getFromFn(value) === 'function';

  to = (node: any, toTypeName: any, types: any) => {
    const typeName = getType(node);
    if (typeName !== this.name) {
      throw new Error(`Can not cast object of type '${typeName}' using '${this.name}'`);
    } else if (!this.castsTo(toTypeName)) {
      throw new Error(`Can not cast '${typeName}' to '${toTypeName}'`);
    }

    return (this.getToFn(toTypeName) as any)(node, types);
  };

  from = (node: any, types: any) => {
    const typeName = getType(node);
    if (!this.castsFrom(typeName)) throw new Error(`Can not cast '${this.name}' from ${typeName}`);

    return (this.getFromFn(typeName) as any)(node, types);
  };
}
