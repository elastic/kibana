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

import { SchemaError, SchemaTypeError, SchemaTypesError } from '.';

export class ValidationError extends SchemaError {
  private static extractMessage(error: SchemaTypeError, namespace?: string, level?: number) {
    const path = typeof namespace === 'string' ? [namespace, ...error.path] : error.path;

    let message = error.message;
    if (error instanceof SchemaTypesError) {
      const indentLevel = level || 0;
      const childErrorMessages = error.errors.map(childError =>
        ValidationError.extractMessage(childError, namespace, indentLevel + 1)
      );

      message = `${message}\n${childErrorMessages
        .map(childErrorMessage => `${' '.repeat(indentLevel)}- ${childErrorMessage}`)
        .join('\n')}`;
    }

    if (path.length === 0) {
      return message;
    }

    return `[${path.join('.')}]: ${message}`;
  }

  constructor(error: SchemaTypeError, namespace?: string) {
    super(ValidationError.extractMessage(error, namespace), error);
  }
}
