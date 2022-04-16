/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { expandShorthand } from './mapping_setup';
import { ES_FIELD_TYPES } from '@kbn/data-plugin/public';

describe('mapping_setup', () => {
  it('allows shortcuts for field types by just setting the value to the type name', () => {
    const mapping = expandShorthand({ foo: ES_FIELD_TYPES.BOOLEAN });

    expect(mapping.foo.type).toBe('boolean');
  });

  it('can set type as an option', () => {
    const mapping = expandShorthand({ foo: { type: ES_FIELD_TYPES.INTEGER } });

    expect(mapping.foo.type).toBe('integer');
  });

  describe('when type is json', () => {
    it('returned object is type text', () => {
      const mapping = expandShorthand({ foo: 'json' });

      expect(mapping.foo.type).toBe('text');
    });

    it('returned object has _serialize function', () => {
      const mapping = expandShorthand({ foo: 'json' });

      expect(mapping.foo._serialize).toBeInstanceOf(Function);
    });

    it('returned object has _deserialize function', () => {
      const mapping = expandShorthand({ foo: 'json' });

      expect(mapping.foo._serialize).toBeInstanceOf(Function);
    });
  });
});
