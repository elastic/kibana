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

export interface StringMap<T = unknown> {
  [key: string]: T;
}

export type IndexAsString<Map> = {
  [k: string]: Map[keyof Map];
} & Map;

export type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;

export interface BoolQuery {
  must_not: Array<Record<string, any>>;
  should: Array<Record<string, any>>;
  filter: Array<Record<string, any>>;
}
