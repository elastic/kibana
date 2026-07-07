/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import argType from './arg_type';
import _ from 'lodash';
import { i18n } from '@kbn/i18n';

export default function validateArgFn(functionDef) {
  return function validateArg(value, name, argDef) {
    const type = argType(value);
    const required = argDef.types;
    const multi = argDef.multi;
    const isCorrectType = (function () {
      // If argument is not allow to be specified multiple times, we're dealing with a plain value for type
      if (!multi) return _.includes(required, type);
      // If it is, we'll get an array for type
      return _.difference(type, required).length === 0;
    })();

    if (isCorrectType) return true;
    else return false;

    if (!isCorrectType) {
      throw new Error(
        i18n.translate('timelion.serverSideErrors.wrongFunctionArgumentTypeErrorMessage', {
          defaultMessage:
            '{functionName}({argumentName}) must be one of {requiredTypes}. Got: {actualType}',
          values: {
            functionName: functionDef.name,
            argumentName: name,
            requiredTypes: JSON.stringify(required),
            actualType: type,
          },
        })
      );
    }
  };
}
