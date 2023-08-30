/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { TypeString } from '../types';
import { ArgumentType } from './arguments';

export class ExpressionFunctionParameter<T = unknown> {
  name: string;
  required: boolean;
  help: string;
  types: ArgumentType<T>['types'];
  default?: ArgumentType<T>['default'];
  aliases: string[];
  multi: boolean;
  resolve: boolean;
  options: T[];

  constructor(name: string, arg: ArgumentType<T>) {
    const { required, help, types, aliases, multi, resolve, options } = arg;

    if (name === '_') {
      throw Error('Arg names must not be _. Use it in aliases instead.');
    }

    this.name = name;
    this.required = !!required;
    this.help = help || '';
    this.types = types || [];
    this.default = arg.default;
    this.aliases = aliases || [];
    this.multi = !!multi;
    this.resolve = resolve == null ? true : resolve;
    this.options = options || [];
  }

  accepts(type: string) {
    return !this.types?.length || this.types.includes(type as TypeString<T>);
  }
}
