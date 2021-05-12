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
    const err = new TransformSavedObjectDocumentError(
      'id',
      'type',
      'namespace',
      'failedTransform',
      'failedDoc',
      originalError
    );
    expect(err).toBeInstanceOf(TransformSavedObjectDocumentError);
    expect(err.id).toEqual('id');
    expect(err.namespace).toEqual('namespace');
    expect(err.stack).not.toBeNull();
  });
  it('constructs an special error message', () => {
    const originalError = new Error('Dang diggity!');
    const err = new TransformSavedObjectDocumentError(
      'id',
      'type',
      'namespace',
      'failedTransform',
      'failedDoc',
      originalError
    );
    expect(err.message).toMatchInlineSnapshot(
      `
      "Failed to transform document id. Transform: failedTransform
      Doc: failedDoc"
    `
    );
  });
  it('handles undefined namespace', () => {
    const originalError = new Error('Dang diggity!');
    const err = new TransformSavedObjectDocumentError(
      'id',
      'type',
      undefined,
      'failedTransform',
      'failedDoc',
      originalError
    );
    expect(err.message).toMatchInlineSnapshot(
      `
      "Failed to transform document id. Transform: failedTransform
      Doc: failedDoc"
    `
    );
  });
});
