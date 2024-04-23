/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { AggregateQuery } from '@kbn/es-query';

const TRANSFORMATIONAL_COMMANDS = ['stats', 'keep'];

export const shouldDisplayHistogram = (query: AggregateQuery) => {
  let queryHasTransformationalCommands = false;
  if ('esql' in query) {
    TRANSFORMATIONAL_COMMANDS.forEach((command: string) => {
      if (query.esql.toLowerCase().includes(command)) {
        queryHasTransformationalCommands = true;
        return;
      }
    });
  }

  return !queryHasTransformationalCommands;
};
