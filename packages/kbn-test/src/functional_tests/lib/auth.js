/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { format as formatUrl } from 'url';

import request from 'request';
import { delay, fromNode as fcb } from 'bluebird';

export const DEFAULT_SUPERUSER_PASS = 'iamsuperuser';

async function updateCredentials(port, auth, username, password, retries = 10) {
  const result = await fcb(cb =>
    request(
      {
        method: 'PUT',
        uri: formatUrl({
          protocol: 'http:',
          auth,
          hostname: 'localhost',
          port,
          pathname: `/_xpack/security/user/${username}/_password`,
        }),
        json: true,
        body: { password },
      },
      (err, httpResponse, body) => {
        cb(err, { httpResponse, body });
      }
    )
  );

  const { body, httpResponse } = result;
  const { statusCode } = httpResponse;
  if (statusCode === 200) {
    return;
  }

  if (retries > 0) {
    await delay(2500);
    return await updateCredentials(port, auth, username, password, retries - 1);
  }

  throw new Error(
    `${statusCode} response, expected 200 -- ${JSON.stringify(body)}`
  );
}

export async function setupUsers(log, config) {
  const esPort = config.get('servers.elasticsearch.port');

  // track the current credentials for the `elastic` user as
  // they will likely change as we apply updates
  let auth = `elastic:${DEFAULT_SUPERUSER_PASS}`;

  // list of updates we need to apply
  const updates = [
    config.get('servers.elasticsearch'),
    config.get('servers.kibana'),
  ];

  for (const { username, password } of updates) {
    log.info('setting %j user password to %j', username, password);
    await updateCredentials(esPort, auth, username, password);
    if (username === 'elastic') {
      auth = `elastic:${password}`;
    }
  }
}
