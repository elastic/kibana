/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { httpServiceMock } from '@kbn/core-http-browser-mocks';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { ContentInsightsClient } from './client';

const setup = (domainId = '../domain?') => {
  const http = httpServiceMock.createStartContract();
  const logger = loggingSystemMock.createLogger();
  const client = new ContentInsightsClient({ http, logger }, { domainId });
  return { client, http, logger };
};

test.each([
  ['123', 'dashboard', '/internal/content_management/insights/dashboard/123/viewed'],
  [
    '../a?b#c%/café',
    '../domain?',
    '/internal/content_management/insights/..%2Fdomain%3F/..%2Fa%3Fb%23c%25%2Fcaf%C3%A9/viewed',
  ],
])('encodes tracking and stats paths for %s', async (id, domainId, path) => {
  const { http, client } = setup(domainId);
  http.post.mockResolvedValue({});
  http.get.mockResolvedValue({ result: { count: 3 } });
  client.track(id, 'viewed');
  expect(http.post).toHaveBeenCalledWith(path);
  await expect(client.getStats(id, 'viewed')).resolves.toEqual({ count: 3 });
  expect(http.get).toHaveBeenCalledWith(`${path}/stats`);
});

test('logs tracking failures', async () => {
  const { http, client, logger } = setup();
  const error = new Error('failed');
  http.post.mockRejectedValue(error);
  client.track('id', 'viewed');
  await Promise.resolve();
  expect(logger.warn).toHaveBeenCalledWith('Could not track viewed event for id. Error: failed', {
    error,
  });
});
