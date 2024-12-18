/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { migrateRawDocsSafelyMock } from './transform_raw_docs.test.mocks';
import { serializerMock } from '@kbn/core-saved-objects-base-server-mocks';
import { createDocumentMigrator, createSavedObjectRawDoc } from '../test_helpers';
import { createDocumentTransformFn } from './transform_raw_docs';

describe('createDocumentTransformFn', () => {
  let serializer: ReturnType<typeof serializerMock.create>;
  let documentMigrator: ReturnType<typeof createDocumentMigrator>;

  beforeEach(() => {
    migrateRawDocsSafelyMock.mockReset();
    serializer = serializerMock.create();
    documentMigrator = createDocumentMigrator();
  });

  it('returns a function calling migrateRawDocsSafely', () => {
    const transformFn = createDocumentTransformFn({
      serializer,
      documentMigrator,
    });

    expect(migrateRawDocsSafelyMock).not.toHaveBeenCalled();

    const documents = [
      createSavedObjectRawDoc({ _id: '1' }),
      createSavedObjectRawDoc({ _id: '2' }),
    ];
    transformFn(documents);

    expect(migrateRawDocsSafelyMock).toHaveBeenCalledTimes(1);
    expect(migrateRawDocsSafelyMock).toHaveBeenCalledWith({
      rawDocs: documents,
      serializer,
      migrateDoc: documentMigrator.migrateAndConvert,
    });
  });

  it('forward the return from migrateRawDocsSafely', () => {
    const transformFn = createDocumentTransformFn({
      serializer,
      documentMigrator,
    });

    const documents = [createSavedObjectRawDoc({ _id: '1' })];

    const expected = Symbol();
    migrateRawDocsSafelyMock.mockReturnValue(expected);

    const result = transformFn(documents);

    expect(result).toBe(expected);
  });
});
