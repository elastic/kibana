/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { getRootPropertiesObjects } from './get_root_properties_objects';

test(`returns single object with properties`, () => {
  const mappings = {
    properties: {
      foo: {
        properties: {},
      },
    },
  };

  const result = getRootPropertiesObjects(mappings);
  expect(result).toEqual({
    foo: {
      properties: {},
    },
  });
});

test(`returns single object with type === 'object'`, () => {
  const mappings = {
    properties: {
      foo: {
        type: 'object',
      },
    },
  };

  const result = getRootPropertiesObjects(mappings);
  expect(result).toEqual({
    foo: {
      type: 'object',
    },
  });
});

test(`returns two objects with properties`, () => {
  const mappings = {
    properties: {
      foo: {
        properties: {},
      },
      bar: {
        properties: {},
      },
    },
  };

  const result = getRootPropertiesObjects(mappings);
  expect(result).toEqual({
    foo: {
      properties: {},
    },
    bar: {
      properties: {},
    },
  });
});

test(`returns two objects with type === 'object'`, () => {
  const mappings = {
    properties: {
      foo: {
        type: 'object',
      },
      bar: {
        type: 'object',
      },
    },
  };

  const result = getRootPropertiesObjects(mappings);
  expect(result).toEqual({
    foo: {
      type: 'object',
    },
    bar: {
      type: 'object',
    },
  });
});

test(`excludes objects without properties and type of keyword`, () => {
  const mappings = {
    properties: {
      foo: {
        type: 'keyword',
      },
    },
  };

  const result = getRootPropertiesObjects(mappings);
  expect(result).toEqual({});
});

test(`excludes two objects without properties and type of keyword`, () => {
  const mappings = {
    properties: {
      foo: {
        type: 'keyword',
      },
      bar: {
        type: 'keyword',
      },
    },
  };

  const result = getRootPropertiesObjects(mappings);
  expect(result).toEqual({});
});

test(`includes one object with properties and excludes one object without properties`, () => {
  const mappings = {
    properties: {
      foo: {
        properties: {},
      },
      bar: {
        type: 'keyword',
      },
    },
  };

  const result = getRootPropertiesObjects(mappings);
  expect(result).toEqual({
    foo: {
      properties: {},
    },
  });
});

test(`includes one object with type === 'object' and excludes one object without properties`, () => {
  const mappings = {
    properties: {
      foo: {
        type: 'object',
      },
      bar: {
        type: 'keyword',
      },
    },
  };

  const result = getRootPropertiesObjects(mappings);
  expect(result).toEqual({
    foo: {
      type: 'object',
    },
  });
});

test('excludes references and migrationVersion which are part of the blacklist', () => {
  const mappings = {
    properties: {
      references: {
        type: 'object',
      },
      migrationVersion: {
        type: 'object',
      },
      foo: {
        type: 'object',
      },
    },
  };
  const result = getRootPropertiesObjects(mappings);
  expect(result).toEqual({
    foo: {
      type: 'object',
    },
  });
});
