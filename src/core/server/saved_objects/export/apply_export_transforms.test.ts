/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { SavedObject } from '../../../types';
import { KibanaRequest } from '../../http';
import { httpServerMock } from '../../http/http_server.mocks';
import { applyExportTransforms } from './apply_export_transforms';
import { SavedObjectsExportTransform } from './types';

const createObj = (
  type: string,
  id: string,
  attributes: Record<string, any> = {}
): SavedObject => ({
  type,
  id,
  attributes,
  references: [],
});

const createTransform = (
  implementation: SavedObjectsExportTransform = (ctx, objs) => objs
): jest.MockedFunction<SavedObjectsExportTransform> => jest.fn(implementation);

const toMap = <V>(record: Record<string, V>): Map<string, V> => new Map(Object.entries(record));

const expectedContext = {
  request: expect.any(KibanaRequest),
};

describe('applyExportTransforms', () => {
  let request: ReturnType<typeof httpServerMock.createKibanaRequest>;

  beforeEach(() => {
    request = httpServerMock.createKibanaRequest();
  });

  it('calls the transform functions with the correct parameters', async () => {
    const foo1 = createObj('foo', '1');
    const foo2 = createObj('foo', '2');
    const bar1 = createObj('bar', '1');

    const fooTransform = createTransform();
    const barTransform = createTransform();

    await applyExportTransforms({
      request,
      objects: [foo1, bar1, foo2],
      transforms: toMap({
        foo: fooTransform,
        bar: barTransform,
      }),
    });

    expect(fooTransform).toHaveBeenCalledTimes(1);
    expect(fooTransform).toHaveBeenCalledWith(expectedContext, [foo1, foo2]);

    expect(barTransform).toHaveBeenCalledTimes(1);
    expect(barTransform).toHaveBeenCalledWith(expectedContext, [bar1]);
  });

  it('does not call the transform functions if no objects are present', async () => {
    const foo1 = createObj('foo', '1');

    const fooTransform = createTransform();
    const barTransform = createTransform();

    await applyExportTransforms({
      request,
      objects: [foo1],
      transforms: toMap({
        foo: fooTransform,
        bar: barTransform,
      }),
    });

    expect(fooTransform).toHaveBeenCalledTimes(1);
    expect(fooTransform).toHaveBeenCalledWith(expectedContext, [foo1]);

    expect(barTransform).not.toHaveBeenCalled();
  });

  it('allows to add objects to the export', async () => {
    const foo1 = createObj('foo', '1');
    const foo2 = createObj('foo', '2');
    const bar1 = createObj('bar', '1');
    const dolly1 = createObj('dolly', '1');
    const hello1 = createObj('hello', '1');

    const fooTransform = createTransform((ctx, objs) => {
      return [...objs, dolly1];
    });
    const barTransform = createTransform((ctx, objs) => {
      return [...objs, hello1];
    });

    const result = await applyExportTransforms({
      request,
      objects: [foo1, bar1, foo2],
      transforms: toMap({
        foo: fooTransform,
        bar: barTransform,
      }),
    });

    expect(result).toEqual([foo1, foo2, dolly1, bar1, hello1]);
  });

  it('returns unmutated objects if no transform is defined for the type', async () => {
    const foo1 = createObj('foo', '1');
    const foo2 = createObj('foo', '2');
    const bar1 = createObj('bar', '1');
    const bar2 = createObj('bar', '2');
    const dolly1 = createObj('dolly', '1');

    const fooTransform = createTransform((ctx, objs) => {
      return [...objs, dolly1];
    });

    const result = await applyExportTransforms({
      request,
      objects: [foo1, foo2, bar1, bar2],
      transforms: toMap({
        foo: fooTransform,
      }),
    });

    expect(result).toEqual([foo1, foo2, dolly1, bar1, bar2]);
  });

  it('allows to mutate objects', async () => {
    const foo1 = createObj('foo', '1', { enabled: true });
    const foo2 = createObj('foo', '2', { enabled: true });

    const disableFoo = (obj: SavedObject<any>) => ({
      ...obj,
      attributes: {
        ...obj.attributes,
        enabled: false,
      },
    });

    const fooTransform = createTransform((ctx, objs) => {
      return objs.map(disableFoo);
    });

    const result = await applyExportTransforms({
      request,
      objects: [foo1, foo2],
      transforms: toMap({
        foo: fooTransform,
      }),
    });

    expect(result).toEqual([foo1, foo2].map(disableFoo));
  });

  it('supports async transforms', async () => {
    const foo1 = createObj('foo', '1');
    const bar1 = createObj('bar', '1');
    const dolly1 = createObj('dolly', '1');
    const hello1 = createObj('hello', '1');

    const fooTransform = createTransform((ctx, objs) => {
      return Promise.resolve([...objs, dolly1]);
    });

    const barTransform = createTransform((ctx, objs) => {
      return [...objs, hello1];
    });

    const result = await applyExportTransforms({
      request,
      objects: [foo1, bar1],
      transforms: toMap({
        foo: fooTransform,
        bar: barTransform,
      }),
    });

    expect(result).toEqual([foo1, dolly1, bar1, hello1]);
  });

  it('uses the provided sortFunction when provided', async () => {
    const foo1 = createObj('foo', 'A');
    const bar1 = createObj('bar', 'B');
    const dolly1 = createObj('dolly', 'C');
    const hello1 = createObj('hello', 'D');

    const fooTransform = createTransform((ctx, objs) => {
      return [...objs, dolly1];
    });

    const barTransform = createTransform((ctx, objs) => {
      return [...objs, hello1];
    });

    const result = await applyExportTransforms({
      request,
      objects: [foo1, bar1],
      transforms: toMap({
        foo: fooTransform,
        bar: barTransform,
      }),
      sortFunction: (obj1, obj2) => (obj1.id > obj2.id ? 1 : -1),
    });

    expect(result).toEqual([foo1, bar1, dolly1, hello1]);
  });

  it('throws when removing objects', async () => {
    const foo1 = createObj('foo', '1', { enabled: true });
    const foo2 = createObj('foo', '2', { enabled: true });

    const fooTransform = createTransform((ctx, objs) => {
      return [objs[0]];
    });

    await expect(
      applyExportTransforms({
        request,
        objects: [foo1, foo2],
        transforms: toMap({
          foo: fooTransform,
        }),
      })
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"Invalid transform performed on objects to export"`
    );
  });

  it('throws when changing the object type', async () => {
    const foo1 = createObj('foo', '1', { enabled: true });
    const foo2 = createObj('foo', '2', { enabled: true });

    const fooTransform = createTransform((ctx, objs) => {
      return objs.map((obj) => ({
        ...obj,
        type: 'mutated',
      }));
    });

    await expect(
      applyExportTransforms({
        request,
        objects: [foo1, foo2],
        transforms: toMap({
          foo: fooTransform,
        }),
      })
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"Invalid transform performed on objects to export"`
    );
  });

  it('throws when changing the object id', async () => {
    const foo1 = createObj('foo', '1', { enabled: true });
    const foo2 = createObj('foo', '2', { enabled: true });

    const fooTransform = createTransform((ctx, objs) => {
      return objs.map((obj, idx) => ({
        ...obj,
        id: `mutated-${idx}`,
      }));
    });

    await expect(
      applyExportTransforms({
        request,
        objects: [foo1, foo2],
        transforms: toMap({
          foo: fooTransform,
        }),
      })
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"Invalid transform performed on objects to export"`
    );
  });

  it('throws if the transform function throws', async () => {
    const foo1 = createObj('foo', '1');

    const fooTransform = createTransform(() => {
      throw new Error('oups.');
    });

    await expect(
      applyExportTransforms({
        request,
        objects: [foo1],
        transforms: toMap({
          foo: fooTransform,
        }),
      })
    ).rejects.toThrowErrorMatchingInlineSnapshot(`"Error transforming objects to export"`);
  });
});
