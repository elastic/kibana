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
    const err = new TransformSavedObjectDocumentError(originalError);
    expect(err).toBeInstanceOf(TransformSavedObjectDocumentError);
    expect(err.stack).not.toBeNull();
    expect(err.originalError).toBe(originalError);
    expect(err.message).toMatchInlineSnapshot(`"Dang diggity!"`);
  });
});
