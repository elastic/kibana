/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import argType from './arg_type';
import _ from 'lodash';
import { i18n } from '@kbn/i18n';

export default function validateArgFn(functionDef) {
  return function validateArg(value, name, argDef) {
    const type = argType(value);
    const required = argDef.types;
    const multi = argDef.multi;
    const isCorrectType = (function() {
      // If argument is not allow to be specified multiple times, we're dealing with a plain value for type
      if (!multi) return _.contains(required, type);
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
