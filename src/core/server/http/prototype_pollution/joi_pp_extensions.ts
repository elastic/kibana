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
import Joi from 'joi';
import { validateObject } from './validate_object';

export function extendJoiForPrototypePollution(joi: any) {
  const createPreventionExtension = (name: string, base: any): Joi.Extension => {
    return {
      name,
      base,
      language: {
        proto_invalid_key: '__proto__ is an invalid key',
        'constructor-prototype_invalid_key': 'constructor.prototype is an invalid key',
        circular_reference: 'Circular reference detected',
      },
      rules: [
        {
          name: 'preventPrototypePollution',
          validate(params: any, value: any, state: Joi.State, options: Joi.ValidationOptions) {
            const result = validateObject(value);
            if (!result.valid) {
              return this.createError(`${name}.${result.errorKey}`, {}, state, options);
            }
            return value;
          },
        },
      ],
    };
  };

  return joi.extend([
    (joiInstance: any) => createPreventionExtension('any', joiInstance.any()),
    (joiInstance: any) => createPreventionExtension('object', joiInstance.object()),
  ]);
}
