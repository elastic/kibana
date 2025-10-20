/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import url from 'url';

export function getUrlParts(source: string) {
  const testUrl = url.parse(source);

  const port = testUrl.port ? parseInt(testUrl.port, 10) : undefined;

  if (!port) {
    throw new Error(`URL ${source} is missing a required port`);
  }

  return {
    protocol: testUrl.protocol?.slice(0, -1),
    hostname: testUrl.hostname === null ? undefined : testUrl.hostname,
    port,
    auth: testUrl.auth === null ? undefined : testUrl.auth,
    username: testUrl.auth?.split(':')[0],
    password: testUrl.auth?.split(':')[1],
  };
}
