/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { identity } from 'lodash';
import { AnyExpressionFunctionDefinition } from './types';
import { ExpressionFunctionParameter } from './expression_function_parameter';
import { ExpressionValue } from '../expression_types/types';
import { ExecutionContext } from '../execution';
import { ExpressionAstFunction } from '../ast';
import { SavedObjectReference } from '../../../../core/types';
import { PersistableState, SerializableState } from '../../../kibana_utils/common';

export class ExpressionFunction implements PersistableState<ExpressionAstFunction['arguments']> {
  /**
   * Name of function
   */
  name: string;

  /**
   * Aliases that can be used instead of `name`.
   */
  aliases: string[];

  /**
   * Return type of function. This SHOULD be supplied. We use it for UI
   * and autocomplete hinting. We may also use it for optimizations in
   * the future.
   */
  type: string;

  /**
   * Function to run function (context, args)
   */
  fn: (input: ExpressionValue, params: Record<string, any>, handlers: object) => ExpressionValue;

  /**
   * A short help text.
   */
  help: string;

  /**
   * Specification of expression function parameters.
   */
  args: Record<string, ExpressionFunctionParameter> = {};

  /**
   * Type of inputs that this function supports.
   */
  inputTypes: string[] | undefined;

  disabled: boolean;
  telemetry: (
    state: ExpressionAstFunction['arguments'],
    telemetryData: Record<string, any>
  ) => Record<string, any>;
  extract: (
    state: ExpressionAstFunction['arguments']
  ) => { state: ExpressionAstFunction['arguments']; references: SavedObjectReference[] };
  inject: (
    state: ExpressionAstFunction['arguments'],
    references: SavedObjectReference[]
  ) => ExpressionAstFunction['arguments'];
  migrations: {
    [key: string]: (state: SerializableState) => SerializableState;
  };

  constructor(functionDefinition: AnyExpressionFunctionDefinition) {
    const {
      name,
      type,
      aliases,
      fn,
      help,
      args,
      inputTypes,
      context,
      disabled,
      telemetry,
      inject,
      extract,
      migrations,
    } = functionDefinition;

    this.name = name;
    this.type = type;
    this.aliases = aliases || [];
    this.fn = (input, params, handlers) =>
      Promise.resolve(fn(input, params, handlers as ExecutionContext));
    this.help = help || '';
    this.inputTypes = inputTypes || context?.types;
    this.disabled = disabled || false;
    this.telemetry = telemetry || ((s, c) => c);
    this.inject = inject || identity;
    this.extract = extract || ((s) => ({ state: s, references: [] }));
    this.migrations = migrations || {};

    for (const [key, arg] of Object.entries(args || {})) {
      this.args[key] = new ExpressionFunctionParameter(key, arg);
    }
  }

  accepts = (type: string): boolean => {
    // If you don't tell us input types, we'll assume you don't care what you get.
    if (!this.inputTypes) return true;
    return this.inputTypes.indexOf(type) > -1;
  };
}
