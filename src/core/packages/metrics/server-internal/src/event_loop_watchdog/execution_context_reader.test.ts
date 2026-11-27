/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { AsyncLocalStorage } from 'node:async_hooks';
import {
  installExecutionContextReader,
  uninstallExecutionContextReader,
  type ReadableExecutionContext,
} from './execution_context_reader';
import { CONTEXT_READER_KEY, MAX_CONTEXT_FIELD_LENGTH } from './constants';

const READER = Symbol.for(CONTEXT_READER_KEY);

/** Calls the reader the way the worker's expression does: `undefined` when there is none. */
const sample = () => {
  const reader = Reflect.get(globalThis, READER);
  return typeof reader === 'function' ? reader() : undefined;
};

describe('execution context reader', () => {
  afterEach(() => uninstallExecutionContextReader());

  it('is not there until installed, and gone once uninstalled', () => {
    expect(sample()).toBeUndefined();
    installExecutionContextReader(() => ({ type: 'task manager' }));
    expect(sample()).toEqual({ type: 'task manager' });
    uninstallExecutionContextReader();
    expect(sample()).toBeUndefined();
  });

  it('returns null for code running outside any execution context', () => {
    installExecutionContextReader(() => undefined);
    expect(sample()).toBeNull();
  });

  it('returns the execution context of the code that calls it', () => {
    const store = new AsyncLocalStorage<ReadableExecutionContext>();
    installExecutionContextReader(() => store.getStore());
    const task = { type: 'task manager', name: 'run alerting:example', id: 'task-1' };
    expect(store.run(task, sample)).toEqual(task);
    expect(sample()).toBeNull();
  });

  it('keeps only the type, name and id of the outer context', () => {
    installExecutionContextReader(
      () =>
        ({
          type: 'task manager',
          name: 'run alerting:example',
          id: 'task-1',
          description: 'run task',
          meta: { large: 'x'.repeat(10_000) },
          child: { type: 'alert', name: 'execute example', id: 'rule-1', url: '/rules' },
        } as ReadableExecutionContext)
    );
    expect(sample()).toEqual({
      type: 'task manager',
      name: 'run alerting:example',
      id: 'task-1',
    });
  });

  it('caps the length of each field', () => {
    const long = (label: string) => label.repeat(MAX_CONTEXT_FIELD_LENGTH + 10);
    installExecutionContextReader(() => ({ type: long('t'), name: long('n'), id: long('i') }));
    expect(sample()).toEqual({
      type: 't'.repeat(MAX_CONTEXT_FIELD_LENGTH),
      name: 'n'.repeat(MAX_CONTEXT_FIELD_LENGTH),
      id: 'i'.repeat(MAX_CONTEXT_FIELD_LENGTH),
    });
  });

  it('is not enumerable on the global object', () => {
    installExecutionContextReader(() => undefined);
    expect(Object.getOwnPropertyDescriptor(globalThis, READER)).toMatchObject({
      enumerable: false,
      writable: false,
      configurable: true,
    });
  });
});
