/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Command, QueryOperator } from '../types';

export function append(command: Command | string): QueryOperator {
  return (source) => {
    const nextCommand = typeof command === 'string' ? { body: command } : command;
    return {
      ...source,
      commands: source.commands.concat(nextCommand),
    };
  };
}
