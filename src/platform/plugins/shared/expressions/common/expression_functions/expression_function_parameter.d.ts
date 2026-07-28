/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ArgumentType } from './arguments';
export declare class ExpressionFunctionParameter<T = unknown> {
  name: string;
  required: boolean;
  help: string;
  types: ArgumentType<T>['types'];
  default?: ArgumentType<T>['default'];
  aliases: string[];
  deprecated: boolean;
  multi: boolean;
  resolve: boolean;
  /**
   * @deprecated
   */
  strict?: boolean;
  options: T[];
  constructor(name: string, arg: ArgumentType<T>);
  accepts(type: string): boolean;
}
