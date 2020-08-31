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

export type UrlGeneratorId = string;

export interface UrlGeneratorState<
  S extends {},
  I extends string | undefined = undefined,
  MS extends {} | undefined = undefined
> {
  State: S;
  MigratedId?: I;
  MigratedState?: MS;
}

export interface UrlGeneratorStateMapping {
  // The `any` here is quite unfortunate.  Using `object` actually gives no type errors in my IDE
  // but running `node scripts/type_check` will cause an error:
  // examples/url_generators_examples/public/url_generator.ts:77:66 -
  // error TS2339: Property 'name' does not exist on type 'object'.  However it's correctly
  // typed when I edit that file.
  [key: string]: UrlGeneratorState<any, string | undefined, object | undefined>;
}

export interface UrlGeneratorsDefinition<Id extends UrlGeneratorId> {
  id: Id;
  createUrl?: (state: UrlGeneratorStateMapping[Id]['State']) => Promise<string>;
  isDeprecated?: boolean;
  migrate?: (
    state: UrlGeneratorStateMapping[Id]['State']
  ) => Promise<{
    state: UrlGeneratorStateMapping[Id]['MigratedState'];
    id: UrlGeneratorStateMapping[Id]['MigratedId'];
  }>;
}
