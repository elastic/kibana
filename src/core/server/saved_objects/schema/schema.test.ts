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

import { SavedObjectsSchema, SavedObjectsSchemaDefinition } from './schema';

describe('#isNamespaceAgnostic', () => {
  const expectResult = (expected: boolean, schemaDefinition?: SavedObjectsSchemaDefinition) => {
    const schema = new SavedObjectsSchema(schemaDefinition);
    const result = schema.isNamespaceAgnostic('foo');
    expect(result).toBe(expected);
  };

  it(`returns false when no schema is defined`, () => {
    expectResult(false);
  });

  it(`returns false for unknown types`, () => {
    expectResult(false, { bar: {} });
  });

  it(`returns false for non-namespace-agnostic type`, () => {
    expectResult(false, { foo: { isNamespaceAgnostic: false } });
    expectResult(false, { foo: { isNamespaceAgnostic: undefined } });
  });

  it(`returns true for explicitly namespace-agnostic type`, () => {
    expectResult(true, { foo: { isNamespaceAgnostic: true } });
  });
});

describe('#isSingleNamespace', () => {
  const expectResult = (expected: boolean, schemaDefinition?: SavedObjectsSchemaDefinition) => {
    const schema = new SavedObjectsSchema(schemaDefinition);
    const result = schema.isSingleNamespace('foo');
    expect(result).toBe(expected);
  };

  it(`returns true when no schema is defined`, () => {
    expectResult(true);
  });

  it(`returns true for unknown types`, () => {
    expectResult(true, { bar: {} });
  });

  it(`returns false for explicitly namespace-agnostic type`, () => {
    expectResult(false, { foo: { isNamespaceAgnostic: true } });
  });

  it(`returns false for explicitly multi-namespace type`, () => {
    expectResult(false, { foo: { multiNamespace: true } });
  });

  it(`returns true for non-namespace-agnostic and non-multi-namespace type`, () => {
    expectResult(true, { foo: { isNamespaceAgnostic: false, multiNamespace: false } });
    expectResult(true, { foo: { isNamespaceAgnostic: false, multiNamespace: undefined } });
    expectResult(true, { foo: { isNamespaceAgnostic: undefined, multiNamespace: false } });
    expectResult(true, { foo: { isNamespaceAgnostic: undefined, multiNamespace: undefined } });
  });
});

describe('#isMultiNamespace', () => {
  const expectResult = (expected: boolean, schemaDefinition?: SavedObjectsSchemaDefinition) => {
    const schema = new SavedObjectsSchema(schemaDefinition);
    const result = schema.isMultiNamespace('foo');
    expect(result).toBe(expected);
  };

  it(`returns false when no schema is defined`, () => {
    expectResult(false);
  });

  it(`returns false for unknown types`, () => {
    expectResult(false, { bar: {} });
  });

  it(`returns false for explicitly namespace-agnostic type`, () => {
    expectResult(false, { foo: { isNamespaceAgnostic: true } });
  });

  it(`returns false for non-multi-namespace type`, () => {
    expectResult(false, { foo: { multiNamespace: false } });
    expectResult(false, { foo: { multiNamespace: undefined } });
  });

  it(`returns true for non-namespace-agnostic and explicitly multi-namespace type`, () => {
    expectResult(true, { foo: { isNamespaceAgnostic: false, multiNamespace: true } });
    expectResult(true, { foo: { isNamespaceAgnostic: undefined, multiNamespace: true } });
  });
});
