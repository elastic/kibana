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

export interface Trigger {
  id: string;
  title?: string;
  description?: string;
  actionIds: string[];
}

// TODO: use the official base Registry interface when available
export interface IRegistry<T> {
  get(id: string): T | undefined;
  length(): number;
  set(id: string, item: T): void;
  reset(): void;
  getAll(): T[];
}

export interface PropertySpec {
  displayName: string;
  accessPath: string;
  id: string;
  description: string;
  value?: string;
}

export interface OutputSpec {
  [id: string]: PropertySpec;
}

export enum ViewMode {
  EDIT = 'edit',
  VIEW = 'view',
}
export interface TimeRange {
  to: string;
  from: string;
}

export enum QueryLanguageType {
  KUERY = 'kuery',
  LUCENE = 'lucene',
}

export interface Query {
  language: QueryLanguageType;
  query: string;
}
