/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { cloneDeep } from 'lodash';
import type { SomeDevLog } from '@kbn/some-dev-log';
import type { SavedObjectsTypeMappingDefinitions } from '@kbn/core-saved-objects-base-server-internal';
import { checkAdditiveOnlyChange } from './check_additive_only_change';
import { createSomeDevLogMock } from './mocks';

describe('#checkAdditiveOnlyChange', () => {
  let log: SomeDevLog;
  beforeEach(() => {
    log = createSomeDevLogMock();
  });
  test('detect removed mapping', () => {
    const current: SavedObjectsTypeMappingDefinitions = {
      foo: {
        properties: {
          text: { type: 'text' },
          number: { type: 'long' },
          object: { type: 'object', properties: { nestedText: { type: 'text' } } },
        },
      },
      bar: {
        properties: {
          text: { type: 'text' },
          number: { type: 'long' },
        },
      },
    };

    const next = cloneDeep(current);
    delete next.foo.properties.text;
    delete next.foo.properties.object.properties!.nestedText;
    delete next.bar.properties.number;

    expect(() => checkAdditiveOnlyChange(log, current, next)).toThrowErrorMatchingInlineSnapshot(`
      "Removing mapped properties is disallowed >8.8. Found the following properties in current mappings but not in next mappings:
      [
        \\"foo.properties.text\\",
        \\"bar.properties.number\\",
        \\"foo.properties.object.properties.nestedText\\"
      ]

      Reach out to the Kibana core team if you have any questions."
    `);
  });

  test('detects when no mappings are removed', () => {
    const current: SavedObjectsTypeMappingDefinitions = {
      foo: {
        properties: {
          text: { type: 'text' },
          number: { type: 'long' },
          object: { type: 'object', properties: { nestedText: { type: 'text' } } },
        },
      },
      bar: {
        properties: {
          text: { type: 'text' },
          number: { type: 'long' },
        },
      },
    };

    expect(() => checkAdditiveOnlyChange(log, current, cloneDeep(current))).not.toThrow();
    expect(log.success).toHaveBeenCalledTimes(1);
    expect(log.success).toHaveBeenCalledWith(
      'Checked 6 existing properties. All present in extracted mappings.'
    );
  });

  test('ignores new field', () => {
    const current: SavedObjectsTypeMappingDefinitions = {
      foo: {
        properties: {
          text: { type: 'text' },
          number: { type: 'long' },
          object: { type: 'object', properties: { nestedText: { type: 'text' } } },
        },
      },
      bar: {
        properties: {
          text: { type: 'text' },
          number: { type: 'long' },
        },
      },
    };

    const next = cloneDeep(current);
    next.foo.properties.newField = { type: 'text' };

    expect(() => checkAdditiveOnlyChange(log, current, next)).not.toThrow();
    expect(log.success).toHaveBeenCalledTimes(1);
    expect(log.success).toHaveBeenCalledWith(
      'Checked 6 existing properties. All present in extracted mappings.'
    );
  });

  test('handles empty current', () => {
    const current: SavedObjectsTypeMappingDefinitions = {};
    const next: SavedObjectsTypeMappingDefinitions = {
      foo: { properties: { text: { type: 'text' } } },
    };

    expect(() => checkAdditiveOnlyChange(log, current, next)).not.toThrow();
    expect(log.success).toHaveBeenCalledTimes(1);
    expect(log.success).toHaveBeenCalledWith(
      'Checked 0 existing properties. All present in extracted mappings.'
    );
  });
});
