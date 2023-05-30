/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  isRootLevelAttribute,
  rewriteRootLevelAttribute,
  isObjectTypeAttribute,
  rewriteObjectTypeAttribute,
} from './validation_utils';

const mockMappings = {
  properties: {
    updated_at: {
      type: 'date',
    },
    foo: {
      properties: {
        title: {
          type: 'text',
        },
        description: {
          type: 'text',
        },
        bytes: {
          type: 'integer',
        },
      },
    },
    bean: {
      properties: {
        canned: {
          fields: {
            text: {
              type: 'text',
            },
          },
          type: 'keyword',
        },
      },
    },
    alert: {
      properties: {
        actions: {
          type: 'nested',
          properties: {
            group: {
              type: 'keyword',
            },
            actionRef: {
              type: 'keyword',
            },
            actionTypeId: {
              type: 'keyword',
            },
            params: {
              enabled: false,
              type: 'object',
            },
          },
        },
        params: {
          type: 'flattened',
        },
      },
    },
  },
} as const;

describe('isRootLevelAttribute', () => {
  it('returns true when referring to a path to a valid root level field', () => {
    expect(isRootLevelAttribute('foo.updated_at', mockMappings, ['foo'])).toBe(true);
  });
  it('returns false when referring to a direct path to a valid root level field', () => {
    expect(isRootLevelAttribute('updated_at', mockMappings, ['foo'])).toBe(false);
  });
  it('returns false when referring to a path to a unknown root level field', () => {
    expect(isRootLevelAttribute('foo.not_present', mockMappings, ['foo'])).toBe(false);
  });
  it('returns false when referring to a path to an existing nested field', () => {
    expect(isRootLevelAttribute('foo.properties.title', mockMappings, ['foo'])).toBe(false);
  });
  it('returns false when referring to a path to a valid root level field of an unknown type', () => {
    expect(isRootLevelAttribute('bar.updated_at', mockMappings, ['foo'])).toBe(false);
  });
  it('returns false when referring to a path to a valid root level type field', () => {
    expect(isRootLevelAttribute('foo.foo', mockMappings, ['foo'])).toBe(false);
  });
});

describe('rewriteRootLevelAttribute', () => {
  it('rewrites the attribute path to strip the type', () => {
    expect(rewriteRootLevelAttribute('foo.references')).toEqual('references');
  });
  it('does not handle real root level path', () => {
    expect(rewriteRootLevelAttribute('references')).not.toEqual('references');
  });
});

describe('isObjectTypeAttribute', () => {
  it('return true if attribute path is valid', () => {
    expect(isObjectTypeAttribute('foo.attributes.description', mockMappings, ['foo'])).toEqual(
      true
    );
  });

  it('return true for nested attributes', () => {
    expect(isObjectTypeAttribute('bean.attributes.canned.text', mockMappings, ['bean'])).toEqual(
      true
    );
  });

  it('return false if attribute path points to an invalid type', () => {
    expect(isObjectTypeAttribute('foo.attributes.description', mockMappings, ['bean'])).toEqual(
      false
    );
  });

  it('returns false if attribute path refers to a type', () => {
    expect(isObjectTypeAttribute('bean', mockMappings, ['bean'])).toEqual(false);
  });

  it('Return error if key does not match SO attribute structure', () => {
    expect(isObjectTypeAttribute('bean.canned.text', mockMappings, ['bean'])).toEqual(false);
  });

  it('Return false if key matches nested type attribute parent', () => {
    expect(isObjectTypeAttribute('alert.actions', mockMappings, ['alert'])).toEqual(false);
  });

  it('returns false if path refers to a non-existent attribute', () => {
    expect(isObjectTypeAttribute('bean.attributes.red', mockMappings, ['bean'])).toEqual(false);
  });
});

describe('rewriteObjectTypeAttribute', () => {
  it('rewrites the attribute path to strip the type', () => {
    expect(rewriteObjectTypeAttribute('foo.attributes.prop')).toEqual('foo.prop');
  });
  it('returns invalid input unchanged', () => {
    expect(rewriteObjectTypeAttribute('foo.references')).toEqual('foo.references');
  });
});
