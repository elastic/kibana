/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isBooleanLiteral, isCommand } from '../ast/is';
import { Builder } from '../builder';
import { ParameterHole } from './parameter_hole';
import type { ESQLCommand } from '../types';
import type { ComposerQuery } from './composer_query';
import type { ComposerQueryTagHole, ParameterShorthandHole } from './types';

/**
 * Query composer allows only named ES|QL parameters, because you cannot
 * mix named and positional, or named and anonymous parameters in the same query.
 *
 * @param name The name of the parameter to validate.
 */
export const validateParamName = (name: string): void => {
  if (typeof name !== 'string' || !name) {
    throw new Error('Unnamed parameters are not allowed');
  }

  if (/^[0-9 ]/.test(name)) {
    throw new Error(
      `Invalid parameter name "${name}". Parameter names cannot start with a digit or space.`
    );
  }
};

const isParameterShorthand = (hole: unknown): hole is ParameterShorthandHole => {
  if (
    !!hole &&
    typeof hole === 'object' &&
    !Array.isArray(hole) &&
    Object.keys(hole).length === 1
  ) {
    return true;
  }
  return false;
};

export const composerQuerySymbol = Symbol('isComposerQuery');

const isComposerQuery = (hole: unknown): hole is ComposerQuery => {
  return !!hole && typeof hole === 'object' && composerQuerySymbol in hole;
};

export const processTemplateHoles = (
  holes: ComposerQueryTagHole[],
  params: Map<string, unknown> = new Map()
) => {
  const length = holes.length;

  for (let i = 0; i < length; i++) {
    const hole = holes[i];

    if (hole instanceof ParameterHole) {
      const name = hole.name ?? `p${params.size}`;

      validateParamName(name);

      if (params.has(name)) {
        throw new Error(`Duplicate parameter name "${name}" found in the query.`);
      }

      const param = Builder.param.named({ value: name });

      holes[i] = param;
      params.set(name, hole.value);
    } else if (isParameterShorthand(hole)) {
      let name: string;
      let value: unknown;
      for (const key in hole) {
        if (Object.prototype.hasOwnProperty.call(hole, key)) {
          name = key;
          value = hole[key];
          break;
        }
      }
      validateParamName(name!);

      if (params.has(name!)) {
        name = `p${params.size}`;
      }

      const param = Builder.param.named({ value: name! });

      holes[i] = param;
      params.set(name!, value);
    } else if (isComposerQuery(hole)) {
      holes[i] = hole.ast;
    }
  }

  return {
    params,
  };
};

const isNopCommand = (command: unknown): boolean => {
  if (!isCommand(command)) return false;

  const args = command.args;

  if (!args || args.length !== 1) return false;

  const arg = args[0];

  if (isBooleanLiteral(arg) && arg.value === 'TRUE') {
    return true;
  }

  return false;
};

/**
 * It is possible to insert `... | WHERE TRUE | ...` *nop* commands into the
 * query stream when building it conditionally. The `WHERE TRUE` command does
 * nothing, Elasticsearch simply removes them. However, it is cleaner to remove
 * them in the AST before sending the query to Elasticsearch. This function
 * removes all *nop* commands from the command list.
 *
 * @param commands The list of commands to process.
 */
export const removeNopCommands = (commands: ESQLCommand[]): ESQLCommand[] => {
  return commands.filter((command) => !isNopCommand(command));
};
