/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { Serializable } from '@kbn/utility-types';
import { AnyExpressionTypeDefinition, ExpressionValue, ExpressionValueConverter } from './types';
import { getType } from './get_type';

export class ExpressionType {
  name: string;
  namespace?: string;
  /**
   * A short help text.
   */
  help: string;

  /**
   * Type validation, useful for checking function output.
   */
  validate: (type: unknown) => void | Error;

  create: unknown;

  /**
   * Optional serialization (used when passing context around client/server).
   */
  serialize?: (value: Serializable) => unknown;
  deserialize?: (serialized: unknown[]) => Serializable;
  private readonly definition: AnyExpressionTypeDefinition;

  constructor(definition: AnyExpressionTypeDefinition) {
    const { name, help, deserialize, serialize, validate, namespace } = definition;

    this.name = name;
    this.namespace = namespace;
    this.help = help || '';
    this.validate = validate || (() => {});

    // Optional
    this.create = (definition as unknown as Record<'create', unknown>).create;

    this.serialize = serialize;
    this.deserialize = deserialize;
    this.definition = definition;
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
