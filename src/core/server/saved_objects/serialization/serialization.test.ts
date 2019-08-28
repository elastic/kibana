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

import _ from 'lodash';
import { SavedObjectsSerializer } from '.';
import { SavedObjectsSchema } from '../schema';
import { encodeVersion } from '../version';

describe('saved object conversion', () => {
  describe('#rawToSavedObject', () => {
    test('it copies the _source.type property to type', () => {
      const serializer = new SavedObjectsSerializer(new SavedObjectsSchema());
      const actual = serializer.rawToSavedObject({
        _id: 'foo:bar',
        _source: {
          type: 'foo',
        },
      });
      expect(actual).toHaveProperty('type', 'foo');
    });

    test('it copies the _source.references property to references', () => {
      const serializer = new SavedObjectsSerializer(new SavedObjectsSchema());
      const actual = serializer.rawToSavedObject({
        _id: 'foo:bar',
        _source: {
          type: 'foo',
          references: [{ name: 'ref_0', type: 'index-pattern', id: 'pattern*' }],
        },
      });
      expect(actual).toHaveProperty('references', [
        {
          name: 'ref_0',
          type: 'index-pattern',
          id: 'pattern*',
        },
      ]);
    });

    test('if specified it copies the _source.migrationVersion property to migrationVersion', () => {
      const serializer = new SavedObjectsSerializer(new SavedObjectsSchema());
      const actual = serializer.rawToSavedObject({
        _id: 'foo:bar',
        _source: {
          type: 'foo',
          migrationVersion: {
            hello: '1.2.3',
            acl: '33.3.5',
          },
        },
      });
      expect(actual).toHaveProperty('migrationVersion', {
        hello: '1.2.3',
        acl: '33.3.5',
      });
    });

    test(`if _source.migrationVersion is unspecified it doesn't set migrationVersion`, () => {
      const serializer = new SavedObjectsSerializer(new SavedObjectsSchema());
      const actual = serializer.rawToSavedObject({
        _id: 'foo:bar',
        _source: {
          type: 'foo',
        },
      });
      expect(actual).not.toHaveProperty('migrationVersion');
    });

    test('it converts the id and type properties, and retains migrationVersion', () => {
      const now = new Date();
      const serializer = new SavedObjectsSerializer(new SavedObjectsSchema());
      const actual = serializer.rawToSavedObject({
        _id: 'hello:world',
        _seq_no: 3,
        _primary_term: 1,
        _source: {
          type: 'hello',
          hello: {
            a: 'b',
            c: 'd',
          },
          migrationVersion: {
            hello: '1.2.3',
            acl: '33.3.5',
          },
          updated_at: now,
        },
      });
      const expected = {
        id: 'world',
        type: 'hello',
        version: encodeVersion(3, 1),
        attributes: {
          a: 'b',
          c: 'd',
        },
        migrationVersion: {
          hello: '1.2.3',
          acl: '33.3.5',
        },
        updated_at: now,
        references: [],
      };
      expect(expected).toEqual(actual);
    });

    test(`if version is unspecified it doesn't set version`, () => {
      const serializer = new SavedObjectsSerializer(new SavedObjectsSchema());
      const actual = serializer.rawToSavedObject({
        _id: 'foo:bar',
        _source: {
          type: 'foo',
          hello: {},
        },
      });
      expect(actual).not.toHaveProperty('version');
    });

    test(`if specified it encodes _seq_no and _primary_term to version`, () => {
      const serializer = new SavedObjectsSerializer(new SavedObjectsSchema());
      const actual = serializer.rawToSavedObject({
        _id: 'foo:bar',
        _seq_no: 4,
        _primary_term: 1,
        _source: {
          type: 'foo',
          hello: {},
        },
      });
      expect(actual).toHaveProperty('version', encodeVersion(4, 1));
    });

    test(`if only _seq_no is specified it throws`, () => {
      const serializer = new SavedObjectsSerializer(new SavedObjectsSchema());
      expect(() =>
        serializer.rawToSavedObject({
          _id: 'foo:bar',
          _seq_no: 4,
          _source: {
            type: 'foo',
            hello: {},
          },
        })
      ).toThrowErrorMatchingInlineSnapshot(`"_primary_term from elasticsearch must be an integer"`);
    });

    test(`if only _primary_term is throws`, () => {
      const serializer = new SavedObjectsSerializer(new SavedObjectsSchema());
      expect(() =>
        serializer.rawToSavedObject({
          _id: 'foo:bar',
          _primary_term: 1,
          _source: {
            type: 'foo',
            hello: {},
          },
        })
      ).toThrowErrorMatchingInlineSnapshot(`"_seq_no from elasticsearch must be an integer"`);
    });

    test('if specified it copies the _source.updated_at property to updated_at', () => {
      const serializer = new SavedObjectsSerializer(new SavedObjectsSchema());
      const now = Date();
      const actual = serializer.rawToSavedObject({
        _id: 'foo:bar',
        _source: {
          type: 'foo',
          updated_at: now,
        },
      });
      expect(actual).toHaveProperty('updated_at', now);
    });

    test(`if _source.updated_at is unspecified it doesn't set updated_at`, () => {
      const serializer = new SavedObjectsSerializer(new SavedObjectsSchema());
      const actual = serializer.rawToSavedObject({
        _id: 'foo:bar',
        _source: {
          type: 'foo',
        },
      });
      expect(actual).not.toHaveProperty('updated_at');
    });

    test('it does not pass unknown properties through', () => {
      const serializer = new SavedObjectsSerializer(new SavedObjectsSchema());
      const actual = serializer.rawToSavedObject({
        _id: 'universe',
        _source: {
          type: 'hello',
          hello: {
            world: 'earth',
          },
          banjo: 'Steve Martin',
        },
      });
      expect(actual).toEqual({
        id: 'universe',
        type: 'hello',
        attributes: {
          world: 'earth',
        },
        references: [],
      });
    });

    test('it does not create attributes if [type] is missing', () => {
      const serializer = new SavedObjectsSerializer(new SavedObjectsSchema());
      const actual = serializer.rawToSavedObject({
        _id: 'universe',
        _source: {
          type: 'hello',
        },
      });
      expect(actual).toEqual({
        id: 'universe',
        type: 'hello',
        references: [],
      });
    });

    test('it fails for documents which do not specify a type', () => {
      const serializer = new SavedObjectsSerializer(new SavedObjectsSchema());
      expect(() =>
        serializer.rawToSavedObject({
          _id: 'universe',
          _source: {
            hello: {
              world: 'earth',
            },
          },
        })
      ).toThrow(/Expected "undefined" to be a saved object type/);
    });

    test('it is complimentary with savedObjectToRaw', () => {
      const serializer = new SavedObjectsSerializer(new SavedObjectsSchema());
      const raw = {
        _id: 'foo-namespace:foo:bar',
        _primary_term: 24,
        _seq_no: 42,
        _source: {
          type: 'foo',
          foo: {
            meaning: 42,
            nested: { stuff: 'here' },
          },
          migrationVersion: {
            foo: '1.2.3',
            bar: '9.8.7',
          },
          namespace: 'foo-namespace',
          updated_at: new Date(),
          references: [],
        },
      };

      expect(serializer.savedObjectToRaw(serializer.rawToSavedObject(_.cloneDeep(raw)))).toEqual(
        raw
      );
    });

    test('it handles unprefixed ids', () => {
      const serializer = new SavedObjectsSerializer(new SavedObjectsSchema());
      const actual = serializer.rawToSavedObject({
        _id: 'universe',
        _source: {
          type: 'hello',
        },
      });

      expect(actual).toHaveProperty('id', 'universe');
    });

    describe('namespaced type without a namespace', () => {
      test(`removes type prefix from _id`, () => {
        const serializer = new SavedObjectsSerializer(new SavedObjectsSchema());
        const actual = serializer.rawToSavedObject({
          _id: 'foo:bar',
          _source: {
            type: 'foo',
          },
        });

        expect(actual).toHaveProperty('id', 'bar');
      });

      test(`if prefixed by random prefix and type it copies _id to id`, () => {
        const serializer = new SavedObjectsSerializer(new SavedObjectsSchema());
        const actual = serializer.rawToSavedObject({
          _id: 'random:foo:bar',
          _source: {
            type: 'foo',
          },
        });

        expect(actual).toHaveProperty('id', 'random:foo:bar');
      });

      test(`doesn't specify namespace`, () => {
        const serializer = new SavedObjectsSerializer(new SavedObjectsSchema());
        const actual = serializer.rawToSavedObject({
          _id: 'foo:bar',
          _source: {
            type: 'foo',
          },
        });

        expect(actual).not.toHaveProperty('namespace');
      });
    });

    describe('namespaced type with a namespace', () => {
      test(`removes type and namespace prefix from _id`, () => {
        const serializer = new SavedObjectsSerializer(new SavedObjectsSchema());
        const actual = serializer.rawToSavedObject({
          _id: 'baz:foo:bar',
          _source: {
            type: 'foo',
            namespace: 'baz',
          },
        });

        expect(actual).toHaveProperty('id', 'bar');
      });

      test(`if prefixed by only type it copies _id to id`, () => {
        const serializer = new SavedObjectsSerializer(new SavedObjectsSchema());
        const actual = serializer.rawToSavedObject({
          _id: 'foo:bar',
          _source: {
            type: 'foo',
            namespace: 'baz',
          },
        });

        expect(actual).toHaveProperty('id', 'foo:bar');
      });

      test(`if prefixed by random prefix and type it copies _id to id`, () => {
        const serializer = new SavedObjectsSerializer(new SavedObjectsSchema());
        const actual = serializer.rawToSavedObject({
          _id: 'random:foo:bar',
          _source: {
            type: 'foo',
            namespace: 'baz',
          },
        });

        expect(actual).toHaveProperty('id', 'random:foo:bar');
      });

      test(`copies _source.namespace to namespace`, () => {
        const serializer = new SavedObjectsSerializer(new SavedObjectsSchema());
        const actual = serializer.rawToSavedObject({
          _id: 'baz:foo:bar',
          _source: {
            type: 'foo',
            namespace: 'baz',
          },
        });

        expect(actual).toHaveProperty('namespace', 'baz');
      });
    });

    describe('namespace agnostic type with a namespace', () => {
      test(`removes type prefix from _id`, () => {
        const serializer = new SavedObjectsSerializer(
          new SavedObjectsSchema({ foo: { isNamespaceAgnostic: true } })
        );
        const actual = serializer.rawToSavedObject({
          _id: 'foo:bar',
          _source: {
            type: 'foo',
            namespace: 'baz',
          },
        });

        expect(actual).toHaveProperty('id', 'bar');
      });

      test(`if prefixed by namespace and type it copies _id to id`, () => {
        const serializer = new SavedObjectsSerializer(
          new SavedObjectsSchema({ foo: { isNamespaceAgnostic: true } })
        );
        const actual = serializer.rawToSavedObject({
          _id: 'baz:foo:bar',
          _source: {
            type: 'foo',
            namespace: 'baz',
          },
        });

        expect(actual).toHaveProperty('id', 'baz:foo:bar');
      });

      test(`doesn't copy _source.namespace to namespace`, () => {
        const serializer = new SavedObjectsSerializer(
          new SavedObjectsSchema({ foo: { isNamespaceAgnostic: true } })
        );
        const actual = serializer.rawToSavedObject({
          _id: 'baz:foo:bar',
          _source: {
            type: 'foo',
            namespace: 'baz',
          },
        });

        expect(actual).not.toHaveProperty('namespace');
      });
    });
  });

  describe('#savedObjectToRaw', () => {
    test('it copies the type property to _source.type and uses the ROOT_TYPE as _type', () => {
      const serializer = new SavedObjectsSerializer(new SavedObjectsSchema());
      const actual = serializer.savedObjectToRaw({
        type: 'foo',
        attributes: {},
      } as any);

      expect(actual._source).toHaveProperty('type', 'foo');
    });

    test('it copies the references property to _source.references', () => {
      const serializer = new SavedObjectsSerializer(new SavedObjectsSchema());
      const actual = serializer.savedObjectToRaw({
        id: '1',
        type: 'foo',
        attributes: {},
        references: [{ name: 'ref_0', type: 'index-pattern', id: 'pattern*' }],
      });
      expect(actual._source).toHaveProperty('references', [
        {
          name: 'ref_0',
          type: 'index-pattern',
          id: 'pattern*',
        },
      ]);
    });

    test('if specified it copies the updated_at property to _source.updated_at', () => {
      const serializer = new SavedObjectsSerializer(new SavedObjectsSchema());
      const now = new Date();
      const actual = serializer.savedObjectToRaw({
        type: '',
        attributes: {},
        updated_at: now,
      } as any);

      expect(actual._source).toHaveProperty('updated_at', now);
    });

    test(`if unspecified it doesn't add updated_at property to _source`, () => {
      const serializer = new SavedObjectsSerializer(new SavedObjectsSchema());
      const actual = serializer.savedObjectToRaw({
        type: '',
        attributes: {},
      } as any);

      expect(actual._source).not.toHaveProperty('updated_at');
    });

    test('it copies the migrationVersion property to _source.migrationVersion', () => {
      const serializer = new SavedObjectsSerializer(new SavedObjectsSchema());
      const actual = serializer.savedObjectToRaw({
        type: '',
        attributes: {},
        migrationVersion: {
          foo: '1.2.3',
          bar: '9.8.7',
        },
      } as any);

      expect(actual._source).toHaveProperty('migrationVersion', {
        foo: '1.2.3',
        bar: '9.8.7',
      });
    });

    test(`if unspecified it doesn't add migrationVersion property to _source`, () => {
      const serializer = new SavedObjectsSerializer(new SavedObjectsSchema());
      const actual = serializer.savedObjectToRaw({
        type: '',
        attributes: {},
      } as any);

      expect(actual._source).not.toHaveProperty('migrationVersion');
    });

    test('it decodes the version property to _seq_no and _primary_term', () => {
      const serializer = new SavedObjectsSerializer(new SavedObjectsSchema());
      const actual = serializer.savedObjectToRaw({
        type: '',
        attributes: {},
        version: encodeVersion(1, 2),
      } as any);

      expect(actual).toHaveProperty('_seq_no', 1);
      expect(actual).toHaveProperty('_primary_term', 2);
    });

    test(`if unspecified it doesn't add _seq_no or _primary_term properties`, () => {
      const serializer = new SavedObjectsSerializer(new SavedObjectsSchema());
      const actual = serializer.savedObjectToRaw({
        type: '',
        attributes: {},
      } as any);

      expect(actual).not.toHaveProperty('_seq_no');
      expect(actual).not.toHaveProperty('_primary_term');
    });

    test(`if version invalid it throws`, () => {
      const serializer = new SavedObjectsSerializer(new SavedObjectsSchema());
      expect(() =>
        serializer.savedObjectToRaw({
          type: '',
          attributes: {},
          version: 'foo',
        } as any)
      ).toThrowErrorMatchingInlineSnapshot(`"Invalid version [foo]"`);
    });

    test('it copies attributes to _source[type]', () => {
      const serializer = new SavedObjectsSerializer(new SavedObjectsSchema());
      const actual = serializer.savedObjectToRaw({
        type: 'foo',
        attributes: {
          foo: true,
          bar: 'quz',
        },
      } as any);

      expect(actual._source).toHaveProperty('foo', {
        foo: true,
        bar: 'quz',
      });
    });

    describe('namespaced type without a namespace', () => {
      test('generates an id prefixed with type, if no id is specified', () => {
        const serializer = new SavedObjectsSerializer(new SavedObjectsSchema());
        const v1 = serializer.savedObjectToRaw({
          type: 'foo',
          attributes: {
            bar: true,
          },
        } as any);

        const v2 = serializer.savedObjectToRaw({
          type: 'foo',
          attributes: {
            bar: true,
          },
        } as any);

        expect(v1._id).toMatch(/foo\:[\w-]+$/);
        expect(v1._id).not.toEqual(v2._id);
      });

      test(`doesn't specify _source.namespace`, () => {
        const serializer = new SavedObjectsSerializer(new SavedObjectsSchema());
        const actual = serializer.savedObjectToRaw({
          type: '',
          attributes: {},
        } as any);

        expect(actual._source).not.toHaveProperty('namespace');
      });
    });

    describe('namespaced type with a namespace', () => {
      test('generates an id prefixed with namespace and type, if no id is specified', () => {
        const serializer = new SavedObjectsSerializer(new SavedObjectsSchema());
        const v1 = serializer.savedObjectToRaw({
          type: 'foo',
          namespace: 'bar',
          attributes: {
            bar: true,
          },
        } as any);

        const v2 = serializer.savedObjectToRaw({
          type: 'foo',
          namespace: 'bar',
          attributes: {
            bar: true,
          },
        } as any);

        expect(v1._id).toMatch(/bar\:foo\:[\w-]+$/);
        expect(v1._id).not.toEqual(v2._id);
      });

      test(`it copies namespace to _source.namespace`, () => {
        const serializer = new SavedObjectsSerializer(new SavedObjectsSchema());
        const actual = serializer.savedObjectToRaw({
          type: 'foo',
          attributes: {},
          namespace: 'bar',
        } as any);

        expect(actual._source).toHaveProperty('namespace', 'bar');
      });
    });

    describe('namespace agnostic type with a namespace', () => {
      test('generates an id prefixed with type, if no id is specified', () => {
        const serializer = new SavedObjectsSerializer(
          new SavedObjectsSchema({ foo: { isNamespaceAgnostic: true } })
        );
        const v1 = serializer.savedObjectToRaw({
          type: 'foo',
          namespace: 'bar',
          attributes: {
            bar: true,
          },
        } as any);

        const v2 = serializer.savedObjectToRaw({
          type: 'foo',
          namespace: 'bar',
          attributes: {
            bar: true,
          },
        } as any);

        expect(v1._id).toMatch(/foo\:[\w-]+$/);
        expect(v1._id).not.toEqual(v2._id);
      });

      test(`doesn't specify _source.namespace`, () => {
        const serializer = new SavedObjectsSerializer(
          new SavedObjectsSchema({ foo: { isNamespaceAgnostic: true } })
        );
        const actual = serializer.savedObjectToRaw({
          type: 'foo',
          namespace: 'bar',
          attributes: {},
        } as any);

        expect(actual._source).not.toHaveProperty('namespace');
      });
    });
  });

  describe('#isRawSavedObject', () => {
    describe('namespaced type without a namespace', () => {
      test('is true if the id is prefixed and the type matches', () => {
        const serializer = new SavedObjectsSerializer(new SavedObjectsSchema());
        expect(
          serializer.isRawSavedObject({
            _id: 'hello:world',
            _source: {
              type: 'hello',
              hello: {},
            },
          })
        ).toBeTruthy();
      });

      test('is false if the id is not prefixed', () => {
        const serializer = new SavedObjectsSerializer(new SavedObjectsSchema());
        expect(
          serializer.isRawSavedObject({
            _id: 'world',
            _source: {
              type: 'hello',
              hello: {},
            },
          })
        ).toBeFalsy();
      });

      test('is false if the type attribute is missing', () => {
        const serializer = new SavedObjectsSerializer(new SavedObjectsSchema());
        expect(
          serializer.isRawSavedObject({
            _id: 'hello:world',
            _source: {
              hello: {},
            },
          })
        ).toBeFalsy();
      });

      test(`is false if the type prefix omits the :`, () => {
        const serializer = new SavedObjectsSerializer(new SavedObjectsSchema());
        expect(
          serializer.isRawSavedObject({
            _id: 'helloworld',
            _source: {
              type: 'hello',
              hello: {},
            },
          })
        ).toBeFalsy();
      });

      test('is false if the type attribute does not match the id', () => {
        const serializer = new SavedObjectsSerializer(new SavedObjectsSchema());
        expect(
          serializer.isRawSavedObject({
            _id: 'hello:world',
            _source: {
              type: 'jam',
              jam: {},
              hello: {},
            },
          })
        ).toBeFalsy();
      });

      test('is false if there is no [type] attribute', () => {
        const serializer = new SavedObjectsSerializer(new SavedObjectsSchema());
        expect(
          serializer.isRawSavedObject({
            _id: 'hello:world',
            _source: {
              type: 'hello',
              jam: {},
            },
          })
        ).toBeFalsy();
      });
    });

    describe('namespaced type with a namespace', () => {
      test('is true if the id is prefixed with type and namespace and the type matches', () => {
        const serializer = new SavedObjectsSerializer(new SavedObjectsSchema());
        expect(
          serializer.isRawSavedObject({
            _id: 'foo:hello:world',
            _source: {
              type: 'hello',
              hello: {},
              namespace: 'foo',
            },
          })
        ).toBeTruthy();
      });

      test('is false if the id is not prefixed by anything', () => {
        const serializer = new SavedObjectsSerializer(new SavedObjectsSchema());
        expect(
          serializer.isRawSavedObject({
            _id: 'world',
            _source: {
              type: 'hello',
              hello: {},
              namespace: 'foo',
            },
          })
        ).toBeFalsy();
      });

      test('is false if the id is prefixed only with type and the type matches', () => {
        const serializer = new SavedObjectsSerializer(new SavedObjectsSchema());
        expect(
          serializer.isRawSavedObject({
            _id: 'hello:world',
            _source: {
              type: 'hello',
              hello: {},
              namespace: 'foo',
            },
          })
        ).toBeFalsy();
      });

      test('is false if the id is prefixed only with namespace and the namespace matches', () => {
        const serializer = new SavedObjectsSerializer(new SavedObjectsSchema());
        expect(
          serializer.isRawSavedObject({
            _id: 'foo:world',
            _source: {
              type: 'hello',
              hello: {},
              namespace: 'foo',
            },
          })
        ).toBeFalsy();
      });

      test(`is false if the id prefix omits the trailing :`, () => {
        const serializer = new SavedObjectsSerializer(new SavedObjectsSchema());
        expect(
          serializer.isRawSavedObject({
            _id: 'foo:helloworld',
            _source: {
              type: 'hello',
              hello: {},
              namespace: 'foo',
            },
          })
        ).toBeFalsy();
      });

      test('is false if the type attribute is missing', () => {
        const serializer = new SavedObjectsSerializer(new SavedObjectsSchema());
        expect(
          serializer.isRawSavedObject({
            _id: 'foo:hello:world',
            _source: {
              hello: {},
              namespace: 'foo',
            },
          })
        ).toBeFalsy();
      });

      test('is false if the type attribute does not match the id', () => {
        const serializer = new SavedObjectsSerializer(new SavedObjectsSchema());
        expect(
          serializer.isRawSavedObject({
            _id: 'foo:hello:world',
            _source: {
              type: 'jam',
              jam: {},
              hello: {},
              namespace: 'foo',
            },
          })
        ).toBeFalsy();
      });

      test('is false if the namespace attribute does not match the id', () => {
        const serializer = new SavedObjectsSerializer(new SavedObjectsSchema());
        expect(
          serializer.isRawSavedObject({
            _id: 'bar:jam:world',
            _source: {
              type: 'jam',
              jam: {},
              hello: {},
              namespace: 'foo',
            },
          })
        ).toBeFalsy();
      });

      test('is false if there is no [type] attribute', () => {
        const serializer = new SavedObjectsSerializer(new SavedObjectsSchema());
        expect(
          serializer.isRawSavedObject({
            _id: 'hello:world',
            _source: {
              type: 'hello',
              jam: {},
              namespace: 'foo',
            },
          })
        ).toBeFalsy();
      });
    });

    describe('namespace agonstic type with a namespace', () => {
      test('is true if the id is prefixed with type and the type matches', () => {
        const serializer = new SavedObjectsSerializer(
          new SavedObjectsSchema({ hello: { isNamespaceAgnostic: true } })
        );
        expect(
          serializer.isRawSavedObject({
            _id: 'hello:world',
            _source: {
              type: 'hello',
              hello: {},
              namespace: 'foo',
            },
          })
        ).toBeTruthy();
      });

      test('is false if the id is not prefixed', () => {
        const serializer = new SavedObjectsSerializer(
          new SavedObjectsSchema({ hello: { isNamespaceAgnostic: true } })
        );
        expect(
          serializer.isRawSavedObject({
            _id: 'world',
            _source: {
              type: 'hello',
              hello: {},
              namespace: 'foo',
            },
          })
        ).toBeFalsy();
      });

      test('is false if the id is prefixed with type and namespace', () => {
        const serializer = new SavedObjectsSerializer(
          new SavedObjectsSchema({ hello: { isNamespaceAgnostic: true } })
        );
        expect(
          serializer.isRawSavedObject({
            _id: 'foo:hello:world',
            _source: {
              type: 'hello',
              hello: {},
              namespace: 'foo',
            },
          })
        ).toBeFalsy();
      });

      test(`is false if the type prefix omits the :`, () => {
        const serializer = new SavedObjectsSerializer(
          new SavedObjectsSchema({ hello: { isNamespaceAgnostic: true } })
        );
        expect(
          serializer.isRawSavedObject({
            _id: 'helloworld',
            _source: {
              type: 'hello',
              hello: {},
              namespace: 'foo',
            },
          })
        ).toBeFalsy();
      });

      test('is false if the type attribute is missing', () => {
        const serializer = new SavedObjectsSerializer(
          new SavedObjectsSchema({ hello: { isNamespaceAgnostic: true } })
        );
        expect(
          serializer.isRawSavedObject({
            _id: 'hello:world',
            _source: {
              hello: {},
              namespace: 'foo',
            },
          })
        ).toBeFalsy();
      });

      test('is false if the type attribute does not match the id', () => {
        const serializer = new SavedObjectsSerializer(
          new SavedObjectsSchema({ hello: { isNamespaceAgnostic: true } })
        );
        expect(
          serializer.isRawSavedObject({
            _id: 'hello:world',
            _source: {
              type: 'jam',
              jam: {},
              hello: {},
              namespace: 'foo',
            },
          })
        ).toBeFalsy();
      });

      test('is false if there is no [type] attribute', () => {
        const serializer = new SavedObjectsSerializer(
          new SavedObjectsSchema({ hello: { isNamespaceAgnostic: true } })
        );
        expect(
          serializer.isRawSavedObject({
            _id: 'hello:world',
            _source: {
              type: 'hello',
              jam: {},
              namespace: 'foo',
            },
          })
        ).toBeFalsy();
      });
    });
  });

  describe('#generateRawId', () => {
    describe('namespaced type without a namespace', () => {
      test('generates an id if none is specified', () => {
        const serializer = new SavedObjectsSerializer(new SavedObjectsSchema());
        const id = serializer.generateRawId('', 'goodbye');
        expect(id).toMatch(/goodbye\:[\w-]+$/);
      });

      test('uses the id that is specified', () => {
        const serializer = new SavedObjectsSerializer(new SavedObjectsSchema());
        const id = serializer.generateRawId('', 'hello', 'world');
        expect(id).toMatch('hello:world');
      });
    });

    describe('namespaced type with a namespace', () => {
      test('generates an id if none is specified and prefixes namespace', () => {
        const serializer = new SavedObjectsSerializer(new SavedObjectsSchema());
        const id = serializer.generateRawId('foo', 'goodbye');
        expect(id).toMatch(/foo:goodbye\:[\w-]+$/);
      });

      test('uses the id that is specified and prefixes the namespace', () => {
        const serializer = new SavedObjectsSerializer(new SavedObjectsSchema());
        const id = serializer.generateRawId('foo', 'hello', 'world');
        expect(id).toMatch('foo:hello:world');
      });
    });

    describe('namespace agnostic type with a namespace', () => {
      test(`generates an id if none is specified and doesn't prefix namespace`, () => {
        const serializer = new SavedObjectsSerializer(
          new SavedObjectsSchema({ foo: { isNamespaceAgnostic: true } })
        );
        const id = serializer.generateRawId('foo', 'goodbye');
        expect(id).toMatch(/goodbye\:[\w-]+$/);
      });

      test(`uses the id that is specified and doesn't prefix the namespace`, () => {
        const serializer = new SavedObjectsSerializer(new SavedObjectsSchema());
        const id = serializer.generateRawId('foo', 'hello', 'world');
        expect(id).toMatch('hello:world');
      });
    });
  });
});
