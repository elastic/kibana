/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { SavedObject } from '../../types';
import { SavedObjectsImportHookResult, SavedObjectsImportWarning } from '../types';
import { executeImportHooks } from './execute_import_hooks';

const createObject = (type: string, id: string): SavedObject => ({
  type,
  id,
  attributes: {},
  references: [],
});

const createHook = (
  result: SavedObjectsImportHookResult | Promise<SavedObjectsImportHookResult> = {}
) => jest.fn().mockReturnValue(result);

const createWarning = (message: string): SavedObjectsImportWarning => ({
  type: 'simple',
  message,
});

describe('executeImportHooks', () => {
  it('invokes the hooks with the correct objects', async () => {
    const foo1 = createObject('foo', '1');
    const foo2 = createObject('foo', '2');
    const bar1 = createObject('bar', '1');
    const objects = [foo1, bar1, foo2];

    const fooHook = createHook();
    const barHook = createHook();

    await executeImportHooks({
      objects,
      importHooks: {
        foo: [fooHook],
        bar: [barHook],
      },
    });

    expect(fooHook).toHaveBeenCalledTimes(1);
    expect(fooHook).toHaveBeenCalledWith([foo1, foo2]);

    expect(barHook).toHaveBeenCalledTimes(1);
    expect(barHook).toHaveBeenCalledWith([bar1]);
  });

  it('handles multiple hooks per type', async () => {
    const foo1 = createObject('foo', '1');
    const foo2 = createObject('foo', '2');
    const bar1 = createObject('bar', '1');
    const objects = [foo1, bar1, foo2];

    const fooHook1 = createHook();
    const fooHook2 = createHook();

    await executeImportHooks({
      objects,
      importHooks: {
        foo: [fooHook1, fooHook2],
      },
    });

    expect(fooHook1).toHaveBeenCalledTimes(1);
    expect(fooHook1).toHaveBeenCalledWith([foo1, foo2]);

    expect(fooHook2).toHaveBeenCalledTimes(1);
    expect(fooHook2).toHaveBeenCalledWith([foo1, foo2]);
  });

  it('does not call a hook if no object of its type is present', async () => {
    const objects = [createObject('foo', '1'), createObject('foo', '2')];
    const hook = createHook();

    await executeImportHooks({
      objects,
      importHooks: {
        bar: [hook],
      },
    });

    expect(hook).not.toHaveBeenCalled();
  });

  it('returns the warnings returned by the hooks', async () => {
    const foo1 = createObject('foo', '1');
    const bar1 = createObject('bar', '1');
    const objects = [foo1, bar1];

    const fooWarning1 = createWarning('foo warning 1');
    const fooWarning2 = createWarning('foo warning 2');
    const barWarning = createWarning('bar warning');

    const fooHook = createHook({ warnings: [fooWarning1, fooWarning2] });
    const barHook = createHook({ warnings: [barWarning] });

    const warnings = await executeImportHooks({
      objects,
      importHooks: {
        foo: [fooHook],
        bar: [barHook],
      },
    });

    expect(warnings).toEqual([fooWarning1, fooWarning2, barWarning]);
  });

  it('handles asynchronous hooks', async () => {
    const foo1 = createObject('foo', '1');
    const bar1 = createObject('bar', '1');
    const objects = [foo1, bar1];

    const fooWarning = createWarning('foo warning 1');
    const barWarning = createWarning('bar warning');

    const fooHook = createHook(Promise.resolve({ warnings: [fooWarning] }));
    const barHook = createHook(Promise.resolve({ warnings: [barWarning] }));

    const warnings = await executeImportHooks({
      objects,
      importHooks: {
        foo: [fooHook],
        bar: [barHook],
      },
    });

    expect(warnings).toEqual([fooWarning, barWarning]);
  });
});
