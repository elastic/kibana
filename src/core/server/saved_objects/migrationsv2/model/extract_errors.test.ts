/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { extractUnknownDocFailureReason } from './extract_errors';

describe('extractUnknownDocFailureReason', () => {
  it('generates the correct error message', () => {
    expect(
      extractUnknownDocFailureReason(
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
      '"
    `);
  });
});
