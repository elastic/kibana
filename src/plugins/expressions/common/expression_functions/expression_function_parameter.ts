/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { ArgumentType } from './arguments';

export class ExpressionFunctionParameter {
  name: string;
  required: boolean;
  help: string;
  types: string[];
  default: any;
  aliases: string[];
  multi: boolean;
  resolve: boolean;
  options: any[];

  constructor(name: string, arg: ArgumentType<any>) {
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
    if (!this.types.length) return true;
    return this.types.indexOf(type) > -1;
  }
}
