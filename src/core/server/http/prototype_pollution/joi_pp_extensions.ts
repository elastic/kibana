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

interface StackItem {
  value: any;
  previousKey: string | null;
}

// we have to do Object.prototype.hasOwnProperty because when you create an object using
// Object.create(null), and I assume other methods, you get an object without a prototype,
// so you can't use current.hasOwnProperty
const hasOwnProperty = (obj: any, property: string) =>
  Object.prototype.hasOwnProperty.call(obj, property);

const isObject = (obj: any) => typeof obj === 'object' && obj !== null;

// we're using a stack instead of recursion so we aren't limited by the call stack
function validateObject(obj: any) {
  if (!isObject(obj)) {
    return;
  }

  const stack: StackItem[] = [
    {
      value: obj,
      previousKey: null,
    },
  ];
  const seen = new WeakSet([obj]);

  while (stack.length > 0) {
    const { value, previousKey } = stack.pop()!;

    if (!isObject(value)) {
      continue;
    }

    if (hasOwnProperty(value, '__proto__')) {
      return 'proto_invalid_key';
    }

    if (hasOwnProperty(value, 'prototype') && previousKey === 'constructor') {
      return `constructor-prototype_invalid_key`;
    }

    // iterating backwards through an array is reportedly more performant
    const entries = Object.entries(value);
    for (let i = entries.length - 1; i >= 0; --i) {
      const [key, childValue] = entries[i];
      if (isObject(childValue)) {
        if (seen.has(childValue)) {
          return `circular_reference`;
        }

        seen.add(childValue);
      }

      stack.push({
        value: childValue,
        previousKey: key,
      });
    }
  }
}

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
            const error = validateObject(value);
            if (error) {
              return this.createError(`${name}.${error}`, {}, state, options);
            }
            return value;
          },
        },
      ],
    };
  };

  const custom = joi.extend([
    (joiInstance: any) => createPreventionExtension('any', joiInstance.any()),
    (joiInstance: any) => createPreventionExtension('object', joiInstance.object()),
  ]);

  return custom;
}
