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

import { SavedObjectsSchema } from './schema';

describe('#addNamespaceAgnosticType', () => {
  it(`can add a string type`, () => {
    const schema = new SavedObjectsSchema();
    schema.addNamespaceAgnosticType('foo');
  });

  it(`can't add a bool type`, () => {
    const schema = new SavedObjectsSchema();
    expect(() => schema.addNamespaceAgnosticType(true)).toThrowErrorMatchingSnapshot();
  });

  it(`can't add null type`, () => {
    const schema = new SavedObjectsSchema();
    expect(() => schema.addNamespaceAgnosticType(null)).toThrowErrorMatchingSnapshot();
  });

  it(`can't add number type`, () => {
    const schema = new SavedObjectsSchema();
    expect(() => schema.addNamespaceAgnosticType(1)).toThrowErrorMatchingSnapshot();
  });

  it(`can't add function type`, () => {
    const schema = new SavedObjectsSchema();
    expect(() => schema.addNamespaceAgnosticType(() => {})).toThrowErrorMatchingSnapshot();
  });

  it(`can't add Symbol type`, () => {
    const schema = new SavedObjectsSchema();
    expect(() => schema.addNamespaceAgnosticType(Symbol())).toThrowErrorMatchingSnapshot();
  });
});

describe('#isNamespaceAgnostic', () => {
  it(`returns false for unknown types`, () => {
    const schema = new SavedObjectsSchema();
    schema.addNamespaceAgnosticType('foo');
    const result = schema.isNamespaceAgnostic('bar');
    expect(result).toBe(false);
  });

  it(`returns true for namespace agnostic registered types`, () => {
    const schema = new SavedObjectsSchema();
    schema.addNamespaceAgnosticType('foo');
    const result = schema.isNamespaceAgnostic('foo');
    expect(result).toBe(true);
  });
});

