/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isObject } from 'lodash';
import { Command, QueryOperator, Params, Query } from '../types';

export function append({
  command,
  bindings,
}: {
  command: Command | string;
  bindings?: Params;
}): QueryOperator {
  return (source): Query => {
    const nextCommand = typeof command === 'string' ? { body: command } : command;

    return {
      ...source,
      commands: source.commands.concat(nextCommand),
      bindings: !!bindings
        ? source.bindings.concat(isObject(bindings) ? bindings : [bindings])
        : source.bindings,
    };
  };
}
