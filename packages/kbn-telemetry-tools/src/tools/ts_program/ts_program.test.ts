/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parseUsageCollection } from '../ts_parser';
import { loadFixtureProgram } from '../test_utils';

describe('createKibanaProgram', () => {
  it('parses files with @kbn/* imports', () => {
    const { program, sourceFile } = loadFixtureProgram('with_kbn_package_import.ts', __dirname);
    expect([...parseUsageCollection(sourceFile, program)]).toMatchInlineSnapshot(`
      Array [
        Array [
          "packages/kbn-telemetry-tools/src/tools/ts_program/__fixture__/with_kbn_package_import.ts",
          Object {
            "collectorName": "with_kbn_package_import",
            "fetch": Object {
              "typeDescriptor": Object {
                "locale": Object {
                  "kind": 154,
                  "type": "StringKeyword",
                },
              },
              "typeName": "Usage",
            },
            "schema": Object {
              "value": Object {
                "locale": Object {
                  "type": "keyword",
                },
              },
            },
          },
        ],
      ]
    `);
  });
});
