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

export declare class SearchSource {
  setPreferredSearchStrategyId: (searchStrategyId: string) => void;
  getPreferredSearchStrategyId: () => string;
  setFields: (newFields: any) => SearchSource;
  setField: (field: string, value: any) => SearchSource;
  getId: () => string;
  getFields: () => any;
  getField: (field: string) => any;
  getOwnField: () => any;
  create: () => SearchSource;
  createCopy: () => SearchSource;
  createChild: (options?: any) => SearchSource;
  setParent: (parent: SearchSource | boolean) => SearchSource;
  getParent: () => SearchSource | undefined;
  fetch: (options: any) => Promise<any>;
  onRequestStart: (
    handler: (searchSource: SearchSource, request: any, options: any) => void
  ) => void;
  getSearchRequestBody: () => any;
  destroy: () => void;
  history: any[];
}
