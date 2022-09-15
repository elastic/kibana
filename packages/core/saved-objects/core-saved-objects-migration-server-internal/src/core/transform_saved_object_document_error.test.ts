/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { TransformSavedObjectDocumentError } from './transform_saved_object_document_error';

describe('TransformSavedObjectDocumentError', () => {
  it('is a special error', () => {
    const originalError = new Error('Dang diggity!');
    const err = new TransformSavedObjectDocumentError(originalError, '8.0.0');

    expect(err).toBeInstanceOf(TransformSavedObjectDocumentError);
    expect(err.stack).not.toBeNull();
    expect(err.originalError).toBe(originalError);
    expect(err.message).toEqual(`Migration function for version 8.0.0 threw an error`);
  });

  it('adds the stack from the original error', () => {
    const originalError = new Error('Some went wrong');
    originalError.stack = 'some stack trace';

    const err = new TransformSavedObjectDocumentError(originalError, '8.0.0');
    const stackLines = err.stack!.split('\n');
    const stackLength = stackLines.length;

    expect(stackLength).toBeGreaterThan(3);
    expect(stackLines[0]).toEqual(`Error: Migration function for version 8.0.0 threw an error`);
    expect(stackLines[stackLength - 2]).toEqual(`Caused by:`);
    expect(stackLines[stackLength - 1]).toEqual(`some stack trace`);
  });

  it('uses the message if the original error does not have a stack', () => {
    const originalError = new Error('Some went wrong');
    delete originalError.stack;

    const err = new TransformSavedObjectDocumentError(originalError, '8.0.0');
    const stackLines = err.stack!.split('\n');
    const stackLength = stackLines.length;

    expect(stackLength).toBeGreaterThan(3);
    expect(stackLines[stackLength - 2]).toEqual(`Caused by:`);
    expect(stackLines[stackLength - 1]).toEqual(`Some went wrong`);
  });
});
