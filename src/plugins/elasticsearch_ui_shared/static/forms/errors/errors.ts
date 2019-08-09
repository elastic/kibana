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

import {
  ERR_FIELD_FORMAT,
  ERR_FIELD_MISSING,
  ERR_MIN_LENGTH,
  ERR_MIN_SELECTION,
} from './constants';

export const fieldMissingError = (fieldName: string, message = 'Field missing') => ({
  code: ERR_FIELD_MISSING,
  fieldName,
  message,
});

export const minLengthError = (
  length: number,
  message = (error: any) => `Must have a minimun length of ${error.length}.`
) => ({
  code: ERR_MIN_LENGTH,
  length,
  message,
});

export const minSelectionError = (
  length: number,
  message = (error: any) => `Must select at least ${error.length} items.`
) => ({
  code: ERR_MIN_SELECTION,
  length,
  message,
});

export const formatError = (format: string, message = 'Format error') => ({
  code: ERR_FIELD_FORMAT,
  format,
  message,
});
