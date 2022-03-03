/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

const chalk = require('chalk');

const { log: defaultLog } = require('./log');

export const SYSTEM_INDICES_SUPERUSER =
  process.env.TEST_ES_SYSTEM_INDICES_USER || 'system_indices_superuser';

exports.NativeRealm = class NativeRealm {
  constructor({ elasticPassword, log = defaultLog, client }) {
    this._elasticPassword = elasticPassword;
    this._client = client;
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
    this._log.info(`Set up ${reservedUsers.length} ES users`);
    await Promise.all([
      ...reservedUsers.map(async (user) => {
        await this.setPassword(user, options[`password.${user}`]);
      }),
      this._createSystemIndicesUser(),
    ]);
  }

  async getReservedUsers(retryOpts = {}) {
    return await this._autoRetry(retryOpts, async () => {
      const resp = await this._client.security.getUser();
      const usernames = Object.keys(resp).filter((user) => resp[user].metadata._reserved === true);

      if (!usernames?.length) {
        throw new Error('no reserved users found, unable to set native realm passwords');
      }

      return usernames;
    });
  }

  async isSecurityEnabled(retryOpts = {}) {
    try {
      return await this._autoRetry(retryOpts, async () => {
        const { features } = await this._client.xpack.info({ categories: 'features' });
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

  async _createSystemIndicesUser() {
    if (!(await this.isSecurityEnabled())) {
      this._log.info('security is not enabled, unable to create role and user');
      return;
    }

    await this._client.security.putRole({
      name: SYSTEM_INDICES_SUPERUSER,
      refresh: 'wait_for',
      cluster: ['all'],
      indices: [
        {
          names: ['*'],
          privileges: ['all'],
          allow_restricted_indices: true,
        },
      ],
      applications: [
        {
          application: '*',
          privileges: ['*'],
          resources: ['*'],
        },
      ],
      run_as: ['*'],
    });

    await this._client.security.putUser({
      username: SYSTEM_INDICES_SUPERUSER,
      refresh: 'wait_for',
      password: this._elasticPassword,
      roles: [SYSTEM_INDICES_SUPERUSER],
    });
  }
};
