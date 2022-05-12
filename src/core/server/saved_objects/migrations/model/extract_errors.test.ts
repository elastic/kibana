/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  extractUnknownDocFailureReason,
  extractIgnoredUnknownDocs,
  fatalReasonDocumentExceedsMaxBatchSizeBytes,
} from './extract_errors';

describe('extractUnknownDocFailureReason', () => {
  it('generates the correct error message', () => {
    expect(
      extractUnknownDocFailureReason(
        'some-url.co',
        [
          {
            id: 'unknownType:12',
            type: 'unknownType',
          },
          {
            id: 'anotherUnknownType:42',
            type: 'anotherUnknownType',
          },
        ],
        '.kibana_15'
      )
    ).toMatchInlineSnapshot(`
      "Migration failed because documents were found for unknown saved object types. To proceed with the migration, please delete these documents from the \\".kibana_15\\" index.
      The documents with unknown types are:
      - \\"unknownType:12\\" (type: \\"unknownType\\")
      - \\"anotherUnknownType:42\\" (type: \\"anotherUnknownType\\")
      You can delete them using the following command:
      curl -X POST \\"{elasticsearch}/.kibana_15/_bulk?pretty\\" -H 'Content-Type: application/json' -d'
      { \\"delete\\" : { \\"_id\\" : \\"unknownType:12\\" } }
      { \\"delete\\" : { \\"_id\\" : \\"anotherUnknownType:42\\" } }
      '

      Alternatively, you can configure kibana to ignore unknown saved objects for this migration.
      Please refer to some-url.co for more information."
    `);
  });
});

describe('extractIgnoredUnknownDocs', () => {
  it('generates the correct error message', () => {
    expect(
      extractIgnoredUnknownDocs([
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
      "Kibana has been configured to ignore unknown documents for this migration.
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
