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

export interface Retry {
  type: string;
  id: string;
  overwrite: boolean;
  replaceReferences: Array<{
    type: string;
    from: string;
    to: string;
  }>;
}

export interface ConflictError {
  type: 'conflict';
}

export interface UnsupportedTypeError {
  type: 'unsupported_type';
}

export interface UnknownError {
  type: 'unknown';
  message: string;
  statusCode: number;
}

export interface MissingReferencesError {
  type: 'missing_references';
  references: Array<{
    type: string;
    id: string;
  }>;
  blocking: Array<{
    type: string;
    id: string;
  }>;
}

export interface ImportError {
  id: string;
  type: string;
  title?: string;
  error: ConflictError | UnsupportedTypeError | MissingReferencesError | UnknownError;
}
