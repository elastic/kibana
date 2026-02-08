/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import _ from 'lodash';

export default function processFunctionDefinition(func: any): Record<string, any> {
  const functions: Record<string, any> = {};
  functions[func.name] = func;
  if (func.aliases) {
    _.each(func.aliases, function (alias: string) {
      const aliasFn = _.clone(func);
      aliasFn.isAlias = true;
      functions[alias] = aliasFn;
    });
  }

  return functions;
}
