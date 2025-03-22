/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import expect from '@kbn/expect';

export const COMMON_REQUEST_HEADERS = {
  'kbn-xsrf': 'some-xsrf-token',
};

export const INTERNAL_REQUEST_HEADERS = {
  ...COMMON_REQUEST_HEADERS,
  'x-elastic-internal-origin': 'kibana',
};

export function assertResponseStatusCode(
  expectedStatus: number,
  actualStatus: number,
  responseBody: object
) {
  expect(actualStatus).to.eql(
    expectedStatus,
    `Expected status code ${expectedStatus}, got ${actualStatus} with body '${JSON.stringify(
      responseBody
    )}'`
  );
}
