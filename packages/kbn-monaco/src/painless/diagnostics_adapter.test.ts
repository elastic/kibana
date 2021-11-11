/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import '../__jest__/jest.mocks'; // Make sure this is the first import

import { Subscription } from 'rxjs';

import { MockIModel } from '../__jest__/types';
import { LangValidation } from '../types';
import { monaco } from '../monaco_imports';
import { ID } from './constants';

import { DiagnosticsAdapter } from './diagnostics_adapter';

const getSyntaxErrors = jest.fn(async (): Promise<string[] | undefined> => undefined);

const getMockWorker = async () => {
  return {
    getSyntaxErrors,
  } as any;
};

function flushPromises() {
  return new Promise((resolve) => setImmediate(resolve));
}

describe('Painless DiagnosticAdapter', () => {
  let diagnosticAdapter: DiagnosticsAdapter;
  let subscription: Subscription;
  let model: MockIModel;
  let validation: LangValidation;

  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(async () => {
    model = monaco.editor.createModel(ID) as unknown as MockIModel;
    diagnosticAdapter = new DiagnosticsAdapter(getMockWorker);

    // validate() has a promise we need to wait for
    // --> await worker.getSyntaxErrors()
    await flushPromises();

    subscription = diagnosticAdapter.validation$.subscribe((newValidation) => {
      validation = newValidation;
    });
  });

  afterEach(() => {
    if (subscription) {
      subscription.unsubscribe();
    }
  });

  test('should validate when the content changes', async () => {
    expect(validation!.isValidating).toBe(false);

    model.setValue('new content');
    await flushPromises();
    expect(validation!.isValidating).toBe(true);

    jest.advanceTimersByTime(500); // there is a 500ms debounce for the validate() to trigger
    await flushPromises();

    expect(validation!.isValidating).toBe(false);

    model.setValue('changed');
    // Flushing promise here is not actually required but adding it to make sure the test
    // works as expected even when doing so.
    await flushPromises();
    expect(validation!.isValidating).toBe(true);

    // when we clear the content we immediately set the
    // "isValidating" to false and mark the content as valid.
    // No need to wait for the setTimeout
    model.setValue('');
    await flushPromises();
    expect(validation!.isValidating).toBe(false);
    expect(validation!.isValid).toBe(true);
  });

  test('should prevent race condition of multiple content change and validation triggered', async () => {
    const errors = ['Syntax error returned'];

    getSyntaxErrors.mockResolvedValueOnce(errors);

    expect(validation!.isValidating).toBe(false);

    model.setValue('foo');
    jest.advanceTimersByTime(300); // only 300ms out of the 500ms

    model.setValue('bar'); // This will cancel the first setTimeout

    jest.advanceTimersByTime(300); // Again, only 300ms out of the 500ms.
    await flushPromises();

    expect(validation!.isValidating).toBe(true); // we are still validating

    jest.advanceTimersByTime(200); // rest of the 500ms
    await flushPromises();

    expect(validation!.isValidating).toBe(false);
    expect(validation!.isValid).toBe(false);
    expect(validation!.errors).toBe(errors);
  });

  test('should prevent race condition (2) of multiple content change and validation triggered', async () => {
    const errors1 = ['First error returned'];
    const errors2 = ['Second error returned'];

    getSyntaxErrors
      .mockResolvedValueOnce(errors1) // first call
      .mockResolvedValueOnce(errors2); // second call

    model.setValue('foo');
    // By now we are waiting on the worker to await getSyntaxErrors()
    // we won't flush the promise to not pass this point in time just yet
    jest.advanceTimersByTime(700);

    // We change the value at the same moment
    model.setValue('bar');
    // now we pass the await getSyntaxErrors() point but its result (errors1) should be stale and discarted
    await flushPromises();

    jest.advanceTimersByTime(300);
    await flushPromises();

    expect(validation!.isValidating).toBe(true); // we are still validating value "bar"

    jest.advanceTimersByTime(200); // rest of the 500ms
    await flushPromises();

    expect(validation!.isValidating).toBe(false);
    expect(validation!.isValid).toBe(false);
    // We have the second error response, the first one has been discarted
    expect(validation!.errors).toBe(errors2);
  });
});
