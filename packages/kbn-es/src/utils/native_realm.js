/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

const { Client } = require('@elastic/elasticsearch');
const chalk = require('chalk');

const { log: defaultLog } = require('./log');

/**
 * Hack to skip the Product Check performed by the Elasticsearch-js client.
 * We noticed a couple of bugs that may need to be fixed before taking full
 * advantage of this feature.
 *
 * The bugs are detailed in this issue: https://github.com/elastic/kibana/issues/105557
 *
 * The hack is copied from the test/utils in the elasticsearch-js repo
 * (https://github.com/elastic/elasticsearch-js/blob/master/test/utils/index.js#L45-L56)
 */
function skipProductCheck(client) {
  const tSymbol = Object.getOwnPropertySymbols(client.transport || client).filter(
    (symbol) => symbol.description === 'product check'
  )[0];
  (client.transport || client)[tSymbol] = 2;
}

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
    // TODO: @elastic/es-clients I had to disable the product check here because the client is getting 404 while ES is initializing, but the requests here auto retry them.
    skipProductCheck(this._client);
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
