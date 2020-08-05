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

import { AnyExpressionTypeDefinition, ExpressionValue, ExpressionValueConverter } from './types';
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

  getToFn = (
    typeName: string
  ): undefined | ExpressionValueConverter<ExpressionValue, ExpressionValue> =>
    !this.definition.to ? undefined : this.definition.to[typeName] || this.definition.to['*'];

  getFromFn = (
    typeName: string
  ): undefined | ExpressionValueConverter<ExpressionValue, ExpressionValue> =>
    !this.definition.from ? undefined : this.definition.from[typeName] || this.definition.from['*'];

  castsTo = (value: ExpressionValue) => typeof this.getToFn(value) === 'function';

  castsFrom = (value: ExpressionValue) => typeof this.getFromFn(value) === 'function';

  to = (value: ExpressionValue, toTypeName: string, types: Record<string, ExpressionType>) => {
    const typeName = getType(value);

    if (typeName !== this.name) {
      throw new Error(`Can not cast object of type '${typeName}' using '${this.name}'`);
    } else if (!this.castsTo(toTypeName)) {
      throw new Error(`Can not cast '${typeName}' to '${toTypeName}'`);
    }

    return this.getToFn(toTypeName)!(value, types);
  };

  from = (value: ExpressionValue, types: Record<string, ExpressionType>) => {
    const typeName = getType(value);

    if (!this.castsFrom(typeName)) {
      throw new Error(`Can not cast '${this.name}' from ${typeName}`);
    }

    return this.getFromFn(typeName)!(value, types);
  };
}
