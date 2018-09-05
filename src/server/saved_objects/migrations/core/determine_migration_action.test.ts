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

import { determineMigrationAction, MigrationAction } from './determine_migration_action';

describe('determineMigrationAction', () => {
  test('requires no action if mappings are identical', () => {
    const actual = {
      doc: {
        dynamic: 'strict',
        properties: {
          hello: {
            properties: {
              name: { type: 'text' },
            },
          },
        },
      },
    };
    const expected = {
      doc: {
        dynamic: 'strict',
        properties: {
          hello: {
            properties: {
              name: { type: 'text' },
            },
          },
        },
      },
    };

    expect(determineMigrationAction(actual, expected)).toEqual(MigrationAction.None);
  });

  test('requires no action if mappings differ only by dynamic properties', () => {
    const actual = {
      doc: {
        dynamic: 'strict',
        properties: {
          hello: { dynamic: true, foo: 'bar' },
          world: { baz: 'bing' },
        },
      },
    };
    const expected = {
      doc: {
        dynamic: 'strict',
        properties: {
          hello: { dynamic: true, goober: 'pea' },
          world: { baz: 'bing' },
        },
      },
    };

    expect(determineMigrationAction(actual, expected)).toEqual(MigrationAction.None);
  });

  test('requires no action if a root property has been disabled', () => {
    const actual = {
      doc: {
        dynamic: 'strict',
        properties: {
          hello: { dynamic: true, foo: 'bar' },
          world: { baz: 'bing' },
        },
      },
    };
    const expected = {
      doc: {
        dynamic: 'strict',
        properties: {
          world: { baz: 'bing' },
        },
      },
    };

    expect(determineMigrationAction(actual, expected)).toEqual(MigrationAction.None);
  });

  test('requires migration if a sub-property differs', () => {
    const actual = {
      doc: {
        dynamic: 'strict',
        properties: {
          world: { type: 'text' },
        },
      },
    };
    const expected = {
      doc: {
        dynamic: 'strict',
        properties: {
          world: { type: 'keword' },
        },
      },
    };

    expect(determineMigrationAction(actual, expected)).toEqual(MigrationAction.Migrate);
  });

  test('requires migration if a type changes', () => {
    const actual = {
      doc: {
        dynamic: 'strict',
        properties: {
          meaning: { type: 'text' },
        },
      },
    };
    const expected = {
      doc: {
        dynamic: 'strict',
        properties: {
          meaning: 42,
        },
      },
    };

    expect(determineMigrationAction(actual, expected)).toEqual(MigrationAction.Migrate);
  });

  test('requires migration if doc dynamic value differs', () => {
    const actual = {
      doc: {
        dynamic: 'strict',
        properties: {
          world: { type: 'text' },
        },
      },
    };
    const expected = {
      doc: {
        dynamic: 'true',
        properties: {
          world: { type: 'text' },
        },
      },
    };

    expect(determineMigrationAction(actual, expected)).toEqual(MigrationAction.Migrate);
  });

  test('requires patching if we added a root property', () => {
    const actual = {
      doc: {
        dynamic: 'strict',
        properties: {},
      },
    };
    const expected = {
      doc: {
        dynamic: 'strict',
        properties: {
          world: { type: 'keword' },
        },
      },
    };

    expect(determineMigrationAction(actual, expected)).toEqual(MigrationAction.Patch);
  });

  test('requires patching if we added a sub-property', () => {
    const actual = {
      doc: {
        dynamic: 'strict',
        properties: {
          world: {
            properties: {
              a: 'a',
            },
          },
        },
      },
    };
    const expected = {
      doc: {
        dynamic: 'strict',
        properties: {
          world: {
            properties: {
              a: 'a',
              b: 'b',
            },
          },
        },
      },
    };

    expect(determineMigrationAction(actual, expected)).toEqual(MigrationAction.Patch);
  });

  test('requires migration if a sub property has been removed', () => {
    const actual = {
      doc: {
        dynamic: 'strict',
        properties: {
          world: {
            properties: {
              a: 'a',
              b: 'b',
            },
          },
        },
      },
    };
    const expected = {
      doc: {
        dynamic: 'strict',
        properties: {
          world: {
            properties: {
              b: 'b',
            },
          },
        },
      },
    };

    expect(determineMigrationAction(actual, expected)).toEqual(MigrationAction.Migrate);
  });
});
