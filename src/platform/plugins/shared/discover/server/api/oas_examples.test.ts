/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { discoverSessionApiDataSchema } from '@kbn/as-code-discover-schema';
import { discoverSessionApiResponseSchema, discoverSessionSearchResponseSchema } from './schema';
import {
  createDiscoverSessionOASOperationObject,
  deleteDiscoverSessionOASOperationObject,
  getDiscoverSessionOASOperationObject,
  searchDiscoverSessionsOASOperationObject,
  upsertDiscoverSessionOASOperationObject,
} from './oas_examples';
import { DISCOVER_SESSION_API_VERSION } from '../../common/constants';

it('provides valid Classic, ES|QL, and Metrics request examples', () => {
  const { examples } =
    createDiscoverSessionOASOperationObject.requestBody.content['application/json'];
  for (const { value } of Object.values(examples)) {
    expect(discoverSessionApiDataSchema.safeParse(value).success).toBe(true);
  }
  expect(
    discoverSessionApiDataSchema.safeParse(
      upsertDiscoverSessionOASOperationObject.requestBody.content['application/json'].examples.esql
        .value
    ).success
  ).toBe(true);
});

it('provides complete session and paginated search response examples', () => {
  const session =
    getDiscoverSessionOASOperationObject.responses[200].content['application/json'].examples.esql
      .value;
  const search =
    searchDiscoverSessionsOASOperationObject.responses[200].content['application/json'].examples
      .sessions.value;
  expect(discoverSessionApiResponseSchema.parse(session)).toEqual(session);
  expect(discoverSessionSearchResponseSchema.parse(search)).toEqual(search);
});

it('includes request bodies and required headers in code samples', () => {
  const { esql } =
    createDiscoverSessionOASOperationObject.requestBody.content['application/json'].examples;
  const [{ source: create }, { source: consoleCreate }] =
    createDiscoverSessionOASOperationObject['x-codeSamples'];
  const [{ source: remove }] = deleteDiscoverSessionOASOperationObject['x-codeSamples'];
  expect(create).toContain(JSON.stringify(esql.value, null, 2));
  expect(create).toContain(`elastic-api-version: ${DISCOVER_SESSION_API_VERSION}`);
  expect(create).toContain('Authorization: ApiKey ${API_KEY}');
  expect(create).toContain('kbn-xsrf: true');
  expect(remove).toContain('curl -X DELETE');
  expect(remove).toContain('kbn-xsrf: true');
  expect(remove).not.toContain(' -d ');
  expect(consoleCreate).toBe(
    `POST kbn:/api/discover_sessions\n${JSON.stringify(esql.value, null, 2)}\n`
  );
});
