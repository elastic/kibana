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

/* eslint-disable max-classes-per-file */

import { get } from 'lodash';
import { AnyExpressionTypeDefinition, ExpressionValue } from './types';
import { getType } from './get_type';

export class ExpressionType {
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

  constructor(private readonly definition: AnyExpressionTypeDefinition) {
    const { name, help, deserialize, serialize, validate } = definition;

    this.name = name;
    this.help = help || '';
    this.validate = validate || (() => {});

    // Optional
    this.create = (definition as any).create;

    this.serialize = serialize;
    this.deserialize = deserialize;
  }

  getToFn = (value: any) =>
    get(this.definition, ['to', value]) || get(this.definition, ['to', '*']);
  getFromFn = (value: any) =>
    get(this.definition, ['from', value]) || get(this.definition, ['from', '*']);

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
