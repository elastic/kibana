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

const words = (input: string) =>
  input
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .toLowerCase()
    .split(/[^a-z0-9]+/g)
    .filter(Boolean);

const upperFirst = (input: string) => `${input.slice(0, 1).toUpperCase()}${input.slice(1)}`;
const lowerFirst = (input: string) => `${input.slice(0, 1).toLowerCase()}${input.slice(1)}`;

export const snakeCase = (input: string) => words(input).join('_');
export const upperCamelCase = (input: string) => words(input).map(upperFirst).join('');
export const camelCase = (input: string) => lowerFirst(upperCamelCase(input));
