/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { validateAdditiveOnlyMappings } from './additive_only_mappings';

describe('validateAdditiveOnlyMappings', () => {
  it('passes when mappings are identical', () => {
    const mappings = {
      'properties.foo.type': 'keyword',
      'properties.bar.type': 'text',
    };
    expect(() => validateAdditiveOnlyMappings('my-type', mappings, mappings)).not.toThrow();
  });

  it('passes when new properties are added', () => {
    const from = {
      'properties.foo.type': 'keyword',
    };
    const to = {
      'properties.foo.type': 'keyword',
      'properties.bar.type': 'text',
    };
    expect(() => validateAdditiveOnlyMappings('my-type', from, to)).not.toThrow();
  });

  it('passes when nested properties are added', () => {
    const from = {
      'properties.foo.type': 'keyword',
    };
    const to = {
      'properties.foo.type': 'keyword',
      'properties.foo.fields.text.type': 'text',
    };
    expect(() => validateAdditiveOnlyMappings('my-type', from, to)).not.toThrow();
  });

  it('throws when a top-level mapped property is removed', () => {
    const from = {
      'properties.foo.type': 'keyword',
      'properties.bar.type': 'text',
    };
    const to = {
      'properties.foo.type': 'keyword',
    };
    expect(() => validateAdditiveOnlyMappings('my-type', from, to)).toThrow(
      /removes mapped properties.*properties\.bar/
    );
  });

  it('throws when a nested mapped property is removed', () => {
    const from = {
      'properties.foo.properties.bar.type': 'keyword',
      'properties.foo.properties.baz.type': 'text',
    };
    const to = {
      'properties.foo.properties.bar.type': 'keyword',
    };
    expect(() => validateAdditiveOnlyMappings('my-type', from, to)).toThrow(
      /properties\.foo\.properties\.baz/
    );
  });

  it('reports multiple removed properties together', () => {
    const from = {
      'properties.foo.type': 'keyword',
      'properties.bar.type': 'text',
      'properties.baz.type': 'keyword',
    };
    const to = {
      'properties.foo.type': 'keyword',
    };
    let error: Error | undefined;
    try {
      validateAdditiveOnlyMappings('my-type', from, to);
    } catch (e) {
      error = e;
    }
    expect(error).toBeDefined();
    expect(error!.message).toContain('properties.bar');
    expect(error!.message).toContain('properties.baz');
  });

  it('does not flag changes to non-property metadata keys', () => {
    const from = {
      'properties.foo.type': 'keyword',
      dynamic: 'strict',
    };
    const to = {
      'properties.foo.type': 'text',
    };
    expect(() => validateAdditiveOnlyMappings('my-type', from, to)).not.toThrow();
  });

  it('passes when baseline has no mapped properties', () => {
    expect(() => validateAdditiveOnlyMappings('my-type', {}, {})).not.toThrow();
    expect(() => validateAdditiveOnlyMappings('my-type', { dynamic: 'strict' }, {})).not.toThrow();
  });

  it('includes the type name in the error message', () => {
    const from = { 'properties.foo.type': 'keyword' };
    const to = {};
    expect(() => validateAdditiveOnlyMappings('my-type', from, to)).toThrow(/'my-type'/);
  });
});
