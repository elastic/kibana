/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import fs from 'fs';
import util from 'util';
import { format as formatUrl } from 'url';
import request from 'request';
import type { ToolingLog } from '@kbn/dev-utils';

export const DEFAULT_SUPERUSER_PASS = 'changeme';
const readFile = util.promisify(fs.readFile);

function delay(delayMs: number) {
  return new Promise((res) => setTimeout(res, delayMs));
}

interface UpdateCredentialsOptions {
  port: number;
  auth: string;
  username: string;
  password: string;
  retries?: number;
  protocol: string;
  caCert?: Buffer | string;
}
async function updateCredentials({
  port,
  auth,
  username,
  password,
  retries = 10,
  protocol,
  caCert,
}: UpdateCredentialsOptions): Promise<void> {
  const result = await new Promise<{ body: any; httpResponse: request.Response }>(
    (resolve, reject) =>
      request(
        {
          method: 'PUT',
          uri: formatUrl({
            protocol: `${protocol}:`,
            auth,
            hostname: 'localhost',
            port,
            pathname: `/_security/user/${username}/_password`,
          }),
          json: true,
          body: { password },
          ca: caCert,
        },
        (err, httpResponse, body) => {
          if (err) return reject(err);
          resolve({ httpResponse, body });
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
    return await updateCredentials({
      port,
      auth,
      username,
      password,
      retries: retries - 1,
      protocol,
      caCert,
    });
  }

  throw new Error(`${statusCode} response, expected 200 -- ${JSON.stringify(body)}`);
}

interface SetupUsersOptions {
  log: ToolingLog;
  esPort: number;
  updates: Array<{ username: string; password: string; roles?: string[] }>;
  protocol?: string;
  caPath?: string;
}

export async function setupUsers({
  log,
  esPort,
  updates,
  protocol = 'http',
  caPath,
}: SetupUsersOptions): Promise<void> {
  // track the current credentials for the `elastic` user as
  // they will likely change as we apply updates
  let auth = `elastic:${DEFAULT_SUPERUSER_PASS}`;
  const caCert = caPath ? await readFile(caPath) : undefined;

  for (const { username, password, roles } of updates) {
    // If working with a built-in user, just change the password
    if (['logstash_system', 'elastic', 'kibana'].includes(username)) {
      await updateCredentials({ port: esPort, auth, username, password, protocol, caCert });
      log.info('setting %j user password to %j', username, password);

      // If not a builtin user, add them
    } else {
      await insertUser({ port: esPort, auth, username, password, roles, protocol, caCert });
      log.info('Added %j user with password to %j', username, password);
    }

    if (username === 'elastic') {
      auth = `elastic:${password}`;
    }
  }
}

interface InserUserOptions {
  port: number;
  auth: string;
  username: string;
  password: string;
  roles?: string[];
  retries?: number;
  protocol: string;
  caCert?: Buffer | string;
}
async function insertUser({
  port,
  auth,
  username,
  password,
  roles = [],
  retries = 10,
  protocol,
  caCert,
}: InserUserOptions): Promise<void> {
  const result = await new Promise<{ body: any; httpResponse: request.Response }>(
    (resolve, reject) =>
      request(
        {
          method: 'POST',
          uri: formatUrl({
            protocol: `${protocol}:`,
            auth,
            hostname: 'localhost',
            port,
            pathname: `/_security/user/${username}`,
          }),
          json: true,
          body: { password, roles },
          ca: caCert,
        },
        (err, httpResponse, body) => {
          if (err) return reject(err);
          resolve({ httpResponse, body });
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
    return await insertUser({
      port,
      auth,
      username,
      password,
      roles,
      retries: retries - 1,
      protocol,
      caCert,
    });
  }

  throw new Error(`${statusCode} response, expected 200 -- ${JSON.stringify(body)}`);
}
