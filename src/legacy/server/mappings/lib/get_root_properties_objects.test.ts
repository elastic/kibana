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
