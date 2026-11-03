/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { FakeRawRequest, Headers } from '@kbn/core-http-server';
import { kibanaRequestFactory } from '@kbn/core-http-server-utils';

/**
 * Builds the request a page submission runs under.
 *
 * A page visitor has no Kibana identity, and the execution engine refuses to run
 * without one. Scheduled workflows solve this with an API key held by Task
 * Manager; a page needs the same thing. In this POC the key comes from
 * `workflowsManagement.pages.runAsApiKey`, so every page in the deployment runs
 * as one principal. The real feature stores a key per page so the run is
 * attributable to the page's owner and can be revoked with the page.
 */
export const buildPageRunRequest = (encodedApiKey: string) => {
  const headers: Headers = { authorization: `ApiKey ${encodedApiKey}` };
  const fakeRawRequest: FakeRawRequest = { headers };
  return kibanaRequestFactory(fakeRawRequest);
};
