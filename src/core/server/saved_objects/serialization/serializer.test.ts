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
import { SavedObjectsSerializer } from './serializer';
import { SavedObjectsRawDoc } from './types';
import { typeRegistryMock } from '../saved_objects_type_registry.mock';
import { encodeVersion } from '../version';

let typeRegistry = typeRegistryMock.create();
typeRegistry.isNamespaceAgnostic.mockReturnValue(true);
typeRegistry.isSingleNamespace.mockReturnValue(false);
typeRegistry.isMultiNamespace.mockReturnValue(false);
const namespaceAgnosticSerializer = new SavedObjectsSerializer(typeRegistry);

typeRegistry = typeRegistryMock.create();
typeRegistry.isNamespaceAgnostic.mockReturnValue(false);
typeRegistry.isSingleNamespace.mockReturnValue(true);
typeRegistry.isMultiNamespace.mockReturnValue(false);
const singleNamespaceSerializer = new SavedObjectsSerializer(typeRegistry);

typeRegistry = typeRegistryMock.create();
typeRegistry.isNamespaceAgnostic.mockReturnValue(false);
typeRegistry.isSingleNamespace.mockReturnValue(false);
typeRegistry.isMultiNamespace.mockReturnValue(true);
const multiNamespaceSerializer = new SavedObjectsSerializer(typeRegistry);

const sampleTemplate = {
  _id: 'foo:bar',
  _source: {
    type: 'foo',
  },
};
const createSampleDoc = (raw: any, template = sampleTemplate): SavedObjectsRawDoc =>
  _.defaultsDeep(raw, template);

describe('#rawToSavedObject', () => {
  test('it copies the _source.type property to type', () => {
    const actual = singleNamespaceSerializer.rawToSavedObject({
      _id: 'foo:bar',
      _source: {
        type: 'foo',
      },
    });
    expect(actual).toHaveProperty('type', 'foo');
  });

  test('it copies the _source.references property to references', () => {
    const actual = singleNamespaceSerializer.rawToSavedObject({
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
    const actual = singleNamespaceSerializer.rawToSavedObject({
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
    const actual = singleNamespaceSerializer.rawToSavedObject({
      _id: 'foo:bar',
      _source: {
        type: 'foo',
      },
    });
    expect(actual).not.toHaveProperty('migrationVersion');
  });

  test('it converts the id and type properties, and retains migrationVersion', () => {
    const now = String(new Date());
    const actual = singleNamespaceSerializer.rawToSavedObject({
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
    const actual = singleNamespaceSerializer.rawToSavedObject({
      _id: 'foo:bar',
      _source: {
        type: 'foo',
        hello: {},
      },
    });
    expect(actual).not.toHaveProperty('version');
  });

  test(`if specified it encodes _seq_no and _primary_term to version`, () => {
    const actual = singleNamespaceSerializer.rawToSavedObject({
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
    expect(() =>
      singleNamespaceSerializer.rawToSavedObject({
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
    expect(() =>
      singleNamespaceSerializer.rawToSavedObject({
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
    const now = Date();
    const actual = singleNamespaceSerializer.rawToSavedObject({
      _id: 'foo:bar',
      _source: {
        type: 'foo',
        updated_at: now,
      },
    });
    expect(actual).toHaveProperty('updated_at', now);
  });

  test(`if _source.updated_at is unspecified it doesn't set updated_at`, () => {
    const actual = singleNamespaceSerializer.rawToSavedObject({
      _id: 'foo:bar',
      _source: {
        type: 'foo',
      },
    });
    expect(actual).not.toHaveProperty('updated_at');
  });

  test('if specified it copies the _source.originId property to originId', () => {
    const originId = 'baz';
    const actual = singleNamespaceSerializer.rawToSavedObject({
      _id: 'foo:bar',
      _source: {
        type: 'foo',
        originId,
      },
    });
    expect(actual).toHaveProperty('originId', originId);
  });

  test(`if _source.originId is unspecified it doesn't set originId`, () => {
    const actual = singleNamespaceSerializer.rawToSavedObject({
      _id: 'foo:bar',
      _source: {
        type: 'foo',
      },
    });
    expect(actual).not.toHaveProperty('originId');
  });

  test('it does not pass unknown properties through', () => {
    const actual = singleNamespaceSerializer.rawToSavedObject({
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
    const actual = singleNamespaceSerializer.rawToSavedObject({
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
    expect(() =>
      singleNamespaceSerializer.rawToSavedObject({
        _id: 'universe',
        _source: {
          hello: {
            world: 'earth',
          },
        } as any,
      })
    ).toThrow(/Expected "undefined" to be a saved object type/);
  });

  test('it is complimentary with savedObjectToRaw', () => {
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
        updated_at: String(new Date()),
        references: [],
        originId: 'baz',
      },
    };

    expect(
      singleNamespaceSerializer.savedObjectToRaw(
        singleNamespaceSerializer.rawToSavedObject(_.cloneDeep(raw))
      )
    ).toEqual(raw);
  });

  test('it handles unprefixed ids', () => {
    const actual = singleNamespaceSerializer.rawToSavedObject({
      _id: 'universe',
      _source: {
        type: 'hello',
      },
    });

    expect(actual).toHaveProperty('id', 'universe');
  });

  describe('namespace-agnostic type with a namespace', () => {
    const raw = createSampleDoc({ _source: { namespace: 'baz' } });
    const actual = namespaceAgnosticSerializer.rawToSavedObject(raw);

    test(`removes type prefix from _id`, () => {
      expect(actual).toHaveProperty('id', 'bar');
    });

    test(`copies _id to id if prefixed by namespace and type`, () => {
      const _id = `${raw._source.namespace}:${raw._id}`;
      const _actual = namespaceAgnosticSerializer.rawToSavedObject({ ...raw, _id });
      expect(_actual).toHaveProperty('id', _id);
    });

    test(`doesn't copy _source.namespace to namespace`, () => {
      expect(actual).not.toHaveProperty('namespace');
    });
  });

  describe('namespace-agnostic type with namespaces', () => {
    const raw = createSampleDoc({ _source: { namespaces: ['baz'] } });
    const actual = namespaceAgnosticSerializer.rawToSavedObject(raw);

    test(`doesn't copy _source.namespaces to namespaces`, () => {
      expect(actual).not.toHaveProperty('namespaces');
    });
  });

  describe('single-namespace type without a namespace', () => {
    const raw = createSampleDoc({});
    const actual = singleNamespaceSerializer.rawToSavedObject(raw);

    test(`removes type prefix from _id`, () => {
      expect(actual).toHaveProperty('id', 'bar');
    });

    test(`copies _id to id if prefixed by random prefix and type`, () => {
      const _id = `random:${raw._id}`;
      const _actual = singleNamespaceSerializer.rawToSavedObject({ ...raw, _id });
      expect(_actual).toHaveProperty('id', _id);
    });

    test(`doesn't specify namespace`, () => {
      expect(actual).not.toHaveProperty('namespace');
    });
  });

  describe('single-namespace type with a namespace', () => {
    const namespace = 'baz';
    const raw = createSampleDoc({ _source: { namespace } });
    const actual = singleNamespaceSerializer.rawToSavedObject(raw);

    test(`removes type and namespace prefix from _id`, () => {
      const _id = `${namespace}:${raw._id}`;
      const _actual = singleNamespaceSerializer.rawToSavedObject({ ...raw, _id });
      expect(_actual).toHaveProperty('id', 'bar');
    });

    test(`copies _id to id if prefixed only by type`, () => {
      expect(actual).toHaveProperty('id', raw._id);
    });

    test(`copies _id to id if prefixed by random prefix and type`, () => {
      const _id = `random:${raw._id}`;
      const _actual = singleNamespaceSerializer.rawToSavedObject({ ...raw, _id });
      expect(_actual).toHaveProperty('id', _id);
    });

    test(`copies _source.namespace to namespace`, () => {
      expect(actual).toHaveProperty('namespace', 'baz');
    });
  });

  describe('single-namespace type with namespaces', () => {
    const raw = createSampleDoc({ _source: { namespaces: ['baz'] } });
    const actual = singleNamespaceSerializer.rawToSavedObject(raw);

    test(`doesn't copy _source.namespaces to namespaces`, () => {
      expect(actual).not.toHaveProperty('namespaces');
    });
  });

  describe('multi-namespace type with a namespace', () => {
    const raw = createSampleDoc({ _source: { namespace: 'baz' } });
    const actual = multiNamespaceSerializer.rawToSavedObject(raw);

    test(`removes type prefix from _id`, () => {
      expect(actual).toHaveProperty('id', 'bar');
    });

    test(`copies _id to id if prefixed by namespace and type`, () => {
      const _id = `${raw._source.namespace}:${raw._id}`;
      const _actual = multiNamespaceSerializer.rawToSavedObject({ ...raw, _id });
      expect(_actual).toHaveProperty('id', _id);
    });

    test(`doesn't copy _source.namespace to namespace`, () => {
      expect(actual).not.toHaveProperty('namespace');
    });
  });

  describe('multi-namespace type with namespaces', () => {
    const raw = createSampleDoc({ _source: { namespaces: ['baz'] } });
    const actual = multiNamespaceSerializer.rawToSavedObject(raw);

    test(`copies _source.namespaces to namespaces`, () => {
      expect(actual).toHaveProperty('namespaces', ['baz']);
    });
  });
});

describe('#savedObjectToRaw', () => {
  test('it copies the type property to _source.type and uses the ROOT_TYPE as _type', () => {
    const actual = singleNamespaceSerializer.savedObjectToRaw({
      type: 'foo',
      attributes: {},
    } as any);

    expect(actual._source).toHaveProperty('type', 'foo');
  });

  test('it copies the references property to _source.references', () => {
    const actual = singleNamespaceSerializer.savedObjectToRaw({
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
    const now = new Date();
    const actual = singleNamespaceSerializer.savedObjectToRaw({
      type: '',
      attributes: {},
      updated_at: now,
    } as any);

    expect(actual._source).toHaveProperty('updated_at', now);
  });

  test(`if unspecified it doesn't add updated_at property to _source`, () => {
    const actual = singleNamespaceSerializer.savedObjectToRaw({
      type: '',
      attributes: {},
    } as any);

    expect(actual._source).not.toHaveProperty('updated_at');
  });

  test('if specified it copies the originId property to _source.originId', () => {
    const originId = 'baz';
    const actual = singleNamespaceSerializer.savedObjectToRaw({
      type: '',
      attributes: {},
      originId,
    } as any);

    expect(actual._source).toHaveProperty('originId', originId);
  });

  test(`if unspecified it doesn't add originId property to _source`, () => {
    const actual = singleNamespaceSerializer.savedObjectToRaw({
      type: '',
      attributes: {},
    } as any);

    expect(actual._source).not.toHaveProperty('originId');
  });

  test('it copies the migrationVersion property to _source.migrationVersion', () => {
    const actual = singleNamespaceSerializer.savedObjectToRaw({
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
    const actual = singleNamespaceSerializer.savedObjectToRaw({
      type: '',
      attributes: {},
    } as any);

    expect(actual._source).not.toHaveProperty('migrationVersion');
  });

  test('it decodes the version property to _seq_no and _primary_term', () => {
    const actual = singleNamespaceSerializer.savedObjectToRaw({
      type: '',
      attributes: {},
      version: encodeVersion(1, 2),
    } as any);

    expect(actual).toHaveProperty('_seq_no', 1);
    expect(actual).toHaveProperty('_primary_term', 2);
  });

  test(`if unspecified it doesn't add _seq_no or _primary_term properties`, () => {
    const actual = singleNamespaceSerializer.savedObjectToRaw({
      type: '',
      attributes: {},
    } as any);

    expect(actual).not.toHaveProperty('_seq_no');
    expect(actual).not.toHaveProperty('_primary_term');
  });

  test(`if version invalid it throws`, () => {
    expect(() =>
      singleNamespaceSerializer.savedObjectToRaw({
        type: '',
        attributes: {},
        version: 'foo',
      } as any)
    ).toThrowErrorMatchingInlineSnapshot(`"Invalid version [foo]"`);
  });

  test('it copies attributes to _source[type]', () => {
    const actual = singleNamespaceSerializer.savedObjectToRaw({
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

  describe('single-namespace type without a namespace', () => {
    test('generates an id prefixed with type, if no id is specified', () => {
      const v1 = singleNamespaceSerializer.savedObjectToRaw({
        type: 'foo',
        attributes: { bar: true },
      } as any);

      const v2 = singleNamespaceSerializer.savedObjectToRaw({
        type: 'foo',
        attributes: { bar: true },
      } as any);

      expect(v1._id).toMatch(/^foo\:[\w-]+$/);
      expect(v1._id).not.toEqual(v2._id);
    });

    test(`doesn't specify _source.namespace`, () => {
      const actual = singleNamespaceSerializer.savedObjectToRaw({
        type: '',
        attributes: {},
      } as any);

      expect(actual._source).not.toHaveProperty('namespace');
    });
  });

  describe('single-namespace type with a namespace', () => {
    test('generates an id prefixed with namespace and type, if no id is specified', () => {
      const v1 = singleNamespaceSerializer.savedObjectToRaw({
        type: 'foo',
        namespace: 'bar',
        attributes: { bar: true },
      } as any);

      const v2 = singleNamespaceSerializer.savedObjectToRaw({
        type: 'foo',
        namespace: 'bar',
        attributes: { bar: true },
      } as any);

      expect(v1._id).toMatch(/^bar\:foo\:[\w-]+$/);
      expect(v1._id).not.toEqual(v2._id);
    });

    test(`it copies namespace to _source.namespace`, () => {
      const actual = singleNamespaceSerializer.savedObjectToRaw({
        type: 'foo',
        attributes: {},
        namespace: 'bar',
      } as any);

      expect(actual._source).toHaveProperty('namespace', 'bar');
    });
  });

  describe('single-namespace type with namespaces', () => {
    test('generates an id prefixed with type, if no id is specified', () => {
      const v1 = namespaceAgnosticSerializer.savedObjectToRaw({
        type: 'foo',
        namespaces: ['bar'],
        attributes: { bar: true },
      } as any);

      const v2 = namespaceAgnosticSerializer.savedObjectToRaw({
        type: 'foo',
        namespaces: ['bar'],
        attributes: { bar: true },
      } as any);

      expect(v1._id).toMatch(/^foo\:[\w-]+$/);
      expect(v1._id).not.toEqual(v2._id);
    });

    test(`doesn't specify _source.namespaces`, () => {
      const actual = namespaceAgnosticSerializer.savedObjectToRaw({
        type: 'foo',
        namespaces: ['bar'],
        attributes: {},
      } as any);

      expect(actual._source).not.toHaveProperty('namespaces');
    });
  });

  describe('namespace-agnostic type with a namespace', () => {
    test('generates an id prefixed with type, if no id is specified', () => {
      const v1 = namespaceAgnosticSerializer.savedObjectToRaw({
        type: 'foo',
        namespace: 'bar',
        attributes: { bar: true },
      } as any);

      const v2 = namespaceAgnosticSerializer.savedObjectToRaw({
        type: 'foo',
        namespace: 'bar',
        attributes: { bar: true },
      } as any);

      expect(v1._id).toMatch(/^foo\:[\w-]+$/);
      expect(v1._id).not.toEqual(v2._id);
    });

    test(`doesn't specify _source.namespace`, () => {
      const actual = namespaceAgnosticSerializer.savedObjectToRaw({
        type: 'foo',
        namespace: 'bar',
        attributes: {},
      } as any);

      expect(actual._source).not.toHaveProperty('namespace');
    });
  });

  describe('namespace-agnostic type with namespaces', () => {
    test('generates an id prefixed with type, if no id is specified', () => {
      const v1 = namespaceAgnosticSerializer.savedObjectToRaw({
        type: 'foo',
        namespaces: ['bar'],
        attributes: { bar: true },
      } as any);

      const v2 = namespaceAgnosticSerializer.savedObjectToRaw({
        type: 'foo',
        namespaces: ['bar'],
        attributes: { bar: true },
      } as any);

      expect(v1._id).toMatch(/^foo\:[\w-]+$/);
      expect(v1._id).not.toEqual(v2._id);
    });

    test(`doesn't specify _source.namespaces`, () => {
      const actual = namespaceAgnosticSerializer.savedObjectToRaw({
        type: 'foo',
        namespaces: ['bar'],
        attributes: {},
      } as any);

      expect(actual._source).not.toHaveProperty('namespaces');
    });
  });

  describe('multi-namespace type with a namespace', () => {
    test('generates an id prefixed with type, if no id is specified', () => {
      const v1 = multiNamespaceSerializer.savedObjectToRaw({
        type: 'foo',
        namespace: 'bar',
        attributes: { bar: true },
      } as any);

      const v2 = multiNamespaceSerializer.savedObjectToRaw({
        type: 'foo',
        namespace: 'bar',
        attributes: { bar: true },
      } as any);

      expect(v1._id).toMatch(/^foo\:[\w-]+$/);
      expect(v1._id).not.toEqual(v2._id);
    });

    test(`doesn't specify _source.namespace`, () => {
      const actual = multiNamespaceSerializer.savedObjectToRaw({
        type: 'foo',
        namespace: 'bar',
        attributes: {},
      } as any);

      expect(actual._source).not.toHaveProperty('namespace');
    });
  });

  describe('multi-namespace type with namespaces', () => {
    test('generates an id prefixed with type, if no id is specified', () => {
      const v1 = multiNamespaceSerializer.savedObjectToRaw({
        type: 'foo',
        namespaces: ['bar'],
        attributes: { bar: true },
      } as any);

      const v2 = multiNamespaceSerializer.savedObjectToRaw({
        type: 'foo',
        namespaces: ['bar'],
        attributes: { bar: true },
      } as any);

      expect(v1._id).toMatch(/^foo\:[\w-]+$/);
      expect(v1._id).not.toEqual(v2._id);
    });

    test(`it copies namespaces to _source.namespaces`, () => {
      const actual = multiNamespaceSerializer.savedObjectToRaw({
        type: 'foo',
        namespaces: ['bar'],
        attributes: {},
      } as any);

      expect(actual._source).toHaveProperty('namespaces', ['bar']);
    });
  });
});

describe('#isRawSavedObject', () => {
  describe('single-namespace type without a namespace', () => {
    test('is true if the id is prefixed and the type matches', () => {
      expect(
        singleNamespaceSerializer.isRawSavedObject({
          _id: 'hello:world',
          _source: {
            type: 'hello',
            hello: {},
          },
        })
      ).toBeTruthy();
    });

    test('is false if the id is not prefixed', () => {
      expect(
        singleNamespaceSerializer.isRawSavedObject({
          _id: 'world',
          _source: {
            type: 'hello',
            hello: {},
          },
        })
      ).toBeFalsy();
    });

    test('is false if the type attribute is missing', () => {
      expect(
        singleNamespaceSerializer.isRawSavedObject({
          _id: 'hello:world',
          _source: {
            hello: {},
          } as any,
        })
      ).toBeFalsy();
    });

    test(`is false if the type prefix omits the :`, () => {
      expect(
        singleNamespaceSerializer.isRawSavedObject({
          _id: 'helloworld',
          _source: {
            type: 'hello',
            hello: {},
          },
        })
      ).toBeFalsy();
    });

    test('is false if the type attribute does not match the id', () => {
      expect(
        singleNamespaceSerializer.isRawSavedObject({
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
      expect(
        singleNamespaceSerializer.isRawSavedObject({
          _id: 'hello:world',
          _source: {
            type: 'hello',
            jam: {},
          },
        })
      ).toBeFalsy();
    });
  });

  describe('single-namespace type with a namespace', () => {
    test('is true if the id is prefixed with type and namespace and the type matches', () => {
      expect(
        singleNamespaceSerializer.isRawSavedObject({
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
      expect(
        singleNamespaceSerializer.isRawSavedObject({
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
      expect(
        singleNamespaceSerializer.isRawSavedObject({
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
      expect(
        singleNamespaceSerializer.isRawSavedObject({
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
      expect(
        singleNamespaceSerializer.isRawSavedObject({
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
      expect(
        singleNamespaceSerializer.isRawSavedObject({
          _id: 'foo:hello:world',
          _source: {
            hello: {},
            namespace: 'foo',
          } as any,
        })
      ).toBeFalsy();
    });

    test('is false if the type attribute does not match the id', () => {
      expect(
        singleNamespaceSerializer.isRawSavedObject({
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
      expect(
        singleNamespaceSerializer.isRawSavedObject({
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
      expect(
        singleNamespaceSerializer.isRawSavedObject({
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

  describe('namespace-agnostic type with a namespace', () => {
    test('is true if the id is prefixed with type and the type matches', () => {
      expect(
        namespaceAgnosticSerializer.isRawSavedObject({
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
      expect(
        namespaceAgnosticSerializer.isRawSavedObject({
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
      expect(
        namespaceAgnosticSerializer.isRawSavedObject({
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
      expect(
        namespaceAgnosticSerializer.isRawSavedObject({
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
      expect(
        namespaceAgnosticSerializer.isRawSavedObject({
          _id: 'hello:world',
          _source: {
            hello: {},
            namespace: 'foo',
          } as any,
        })
      ).toBeFalsy();
    });

    test('is false if the type attribute does not match the id', () => {
      expect(
        namespaceAgnosticSerializer.isRawSavedObject({
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
      expect(
        namespaceAgnosticSerializer.isRawSavedObject({
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
  describe('single-namespace type without a namespace', () => {
    test('generates an id if none is specified', () => {
      const id = singleNamespaceSerializer.generateRawId('', 'goodbye');
      expect(id).toMatch(/^goodbye\:[\w-]+$/);
    });

    test('uses the id that is specified', () => {
      const id = singleNamespaceSerializer.generateRawId('', 'hello', 'world');
      expect(id).toEqual('hello:world');
    });
  });

  describe('single-namespace type with a namespace', () => {
    test('generates an id if none is specified and prefixes namespace', () => {
      const id = singleNamespaceSerializer.generateRawId('foo', 'goodbye');
      expect(id).toMatch(/^foo:goodbye\:[\w-]+$/);
    });

    test('uses the id that is specified and prefixes the namespace', () => {
      const id = singleNamespaceSerializer.generateRawId('foo', 'hello', 'world');
      expect(id).toEqual('foo:hello:world');
    });
  });

  describe('namespace-agnostic type with a namespace', () => {
    test(`generates an id if none is specified and doesn't prefix namespace`, () => {
      const id = namespaceAgnosticSerializer.generateRawId('foo', 'goodbye');
      expect(id).toMatch(/^goodbye\:[\w-]+$/);
    });

    test(`uses the id that is specified and doesn't prefix the namespace`, () => {
      const id = namespaceAgnosticSerializer.generateRawId('foo', 'hello', 'world');
      expect(id).toEqual('hello:world');
    });
  });
});
