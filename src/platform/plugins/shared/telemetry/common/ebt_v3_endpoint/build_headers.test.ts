/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { buildShipperHeaders } from './build_headers';

describe('buildShipperHeaders', () => {
  test('builds the headers as expected in the V3 endpoints', () => {
    expect(buildShipperHeaders('test-cluster', '1.2.3', 'test-license')).toMatchInlineSnapshot(`
      Object {
        "content-type": "application/x-ndjson",
        "x-elastic-cluster-id": "test-cluster",
        "x-elastic-license-id": "test-license",
        "x-elastic-stack-version": "1.2.3",
      }
    `);
  });

  test('if license is not provided, it skips the license header', () => {
    expect(buildShipperHeaders('test-cluster', '1.2.3')).toMatchInlineSnapshot(`
      Object {
        "content-type": "application/x-ndjson",
        "x-elastic-cluster-id": "test-cluster",
        "x-elastic-stack-version": "1.2.3",
      }
    `);
  });
});
