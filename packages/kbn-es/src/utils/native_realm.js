/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

const { Client } = require('@elastic/elasticsearch');
const chalk = require('chalk');

const { log: defaultLog } = require('./log');

exports.NativeRealm = class NativeRealm {
  constructor({ elasticPassword, port, log = defaultLog, ssl = false, caCert }) {
    this._client = new Client({
      node: `${ssl ? 'https' : 'http'}://elastic:${elasticPassword}@localhost:${port}`,
      ssl: ssl
        ? {
            ca: caCert,
            rejectUnauthorized: true,
          }
        : undefined,
    });
    this._elasticPassword = elasticPassword;
    this._log = log;
  }

  async setPassword(username, password = this._elasticPassword, retryOpts = {}) {
    await this._autoRetry(retryOpts, async () => {
      try {
        await this._client.security.changePassword({
          username,
          refresh: 'wait_for',
          body: {
            password,
          },
        });
      } catch (err) {
        const isAnonymousUserPasswordChangeError =
          err.statusCode === 400 &&
          err.body &&
          err.body.error &&
          err.body.error.reason.startsWith(`user [${username}] is anonymous`);
        if (!isAnonymousUserPasswordChangeError) {
          throw err;
        } else {
          this._log.info(
            `cannot set password for anonymous user ${chalk.bold(username)}, skipping`
          );
        }
      }
    });
  }

  async setPasswords(options) {
    if (!(await this.isSecurityEnabled())) {
      this._log.info('security is not enabled, unable to set native realm passwords');
      return;
    }

    const reservedUsers = await this.getReservedUsers();
    await Promise.all(
      reservedUsers.map(async (user) => {
        await this.setPassword(user, options[`password.${user}`]);
      })
    );
  }

  async getReservedUsers(retryOpts = {}) {
    return await this._autoRetry(retryOpts, async () => {
      const resp = await this._client.security.getUser();
      const usernames = Object.keys(resp.body).filter(
        (user) => resp.body[user].metadata._reserved === true
      );

      if (!usernames?.length) {
        throw new Error('no reserved users found, unable to set native realm passwords');
      }

      return usernames;
    });
  }

  async isSecurityEnabled(retryOpts = {}) {
    try {
      return await this._autoRetry(retryOpts, async () => {
        const {
          body: { features },
        } = await this._client.xpack.info({ categories: 'features' });
        return features.security && features.security.enabled && features.security.available;
      });
    } catch (error) {
      if (error.meta && error.meta.statusCode === 400) {
        return false;
      }

      throw error;
    }
  }

  async _autoRetry(opts, fn) {
    const { attempt = 1, maxAttempts = 3 } = opts;

    try {
      return await fn(attempt);
    } catch (error) {
      if (attempt >= maxAttempts) {
        throw error;
      }

      const sec = 1.5 * attempt;
      this._log.warning(`assuming ES isn't initialized completely, trying again in ${sec} seconds`);
      await new Promise((resolve) => setTimeout(resolve, sec * 1000));

      const nextOpts = {
        ...opts,
        attempt: attempt + 1,
      };
      return await this._autoRetry(nextOpts, fn);
    }
  }
};
