/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import _ from 'lodash';
import { i18n } from '@kbn/i18n';

// Only applies to already resolved arguments
export default function indexArguments(functionDef, orderedArgs) {
  const validateArg = require('./validate_arg')(functionDef);

  // This almost certainly is not required
  const allowedLength = functionDef.extended
    ? functionDef.args.length + 2
    : functionDef.args.length;
  if (orderedArgs.length > allowedLength) {
    throw new Error(
      i18n.translate('timelion.serverSideErrors.argumentsOverflowErrorMessage', {
        defaultMessage: 'Too many arguments passed to: {functionName}',
        values: {
          functionName: functionDef.name,
        },
      })
    );
  }

  const indexedArgs = {};
  // Check and index each known argument
  _.each(functionDef.args, function (argDef, i) {
    const value = orderedArgs[i];
    validateArg(value, argDef.name, argDef);
    indexedArgs[argDef.name] = value;
  });

  // Also check and index the extended arguments if enabled
  if (functionDef.extended) {
    const values = orderedArgs[orderedArgs.length - 1];
    const names = orderedArgs[orderedArgs.length - 2];
    _.each(values, function (value, i) {
      validateArg(value, names[i], functionDef.extended);
      indexedArgs[names[i]] = value;
    });
  }

  return indexedArgs;
}
