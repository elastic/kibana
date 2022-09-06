/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  extractUnknownDocFailureReason,
  extractDiscardedUnknownDocs,
  fatalReasonDocumentExceedsMaxBatchSizeBytes,
} from './extract_errors';

describe('extractUnknownDocFailureReason', () => {
  it('generates the correct error message', () => {
    expect(
      extractUnknownDocFailureReason('some-url.co', [
        {
          id: 'unknownType:12',
          type: 'unknownType',
        },
        {
          id: 'anotherUnknownType:42',
          type: 'anotherUnknownType',
        },
      ])
    ).toMatchInlineSnapshot(`
      "Migration failed because some documents were found which use unknown saved object types:
      - \\"unknownType:12\\" (type: \\"unknownType\\")
      - \\"anotherUnknownType:42\\" (type: \\"anotherUnknownType\\")

      To proceed with the migration you can configure Kibana to discard unknown saved objects for this migration.
      Please refer to some-url.co for more information."
    `);
  });
});

describe('extractDiscardedUnknownDocs', () => {
  it('generates the correct error message', () => {
    expect(
      extractDiscardedUnknownDocs([
        {
          id: 'unknownType:12',
          type: 'unknownType',
        },
        {
          id: 'anotherUnknownType:42',
          type: 'anotherUnknownType',
        },
      ])
    ).toMatchInlineSnapshot(`
      "Kibana has been configured to discard unknown documents for this migration.
      Therefore, the following documents with unknown types will not be taken into account and they will not be available after the migration:
      - \\"unknownType:12\\" (type: \\"unknownType\\")
      - \\"anotherUnknownType:42\\" (type: \\"anotherUnknownType\\")
      "
    `);
  });
});

describe('fatalReasonDocumentExceedsMaxBatchSizeBytes', () => {
  it('generate the correct error message', () => {
    expect(
      fatalReasonDocumentExceedsMaxBatchSizeBytes({
        _id: 'abc',
        docSizeBytes: 106954752,
        maxBatchSizeBytes: 104857600,
      })
    ).toMatchInlineSnapshot(
      `"The document with _id \\"abc\\" is 106954752 bytes which exceeds the configured maximum batch size of 104857600 bytes. To proceed, please increase the 'migrations.maxBatchSizeBytes' Kibana configuration option and ensure that the Elasticsearch 'http.max_content_length' configuration option is set to an equal or larger value."`
    );
  });
});
