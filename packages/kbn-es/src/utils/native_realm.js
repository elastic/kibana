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
  constructor(elasticPassword, port, log = defaultLog) {
    this._client = new Client({ node: `http://elastic:${elasticPassword}@localhost:${port}` });
    this._elasticPassword = elasticPassword;
    this._log = log;
  }

  async setPassword(username, password = this._elasticPassword) {
    this._log.info(`setting ${chalk.bold(username)} password to ${chalk.bold(password)}`);

    try {
      await this._client.security.changePassword({
        username,
        refresh: 'wait_for',
        body: {
          password,
        },
      });
    } catch (e) {
      this._log.error(
        chalk.red(`unable to set password for ${chalk.bold(username)}: ${e.message}`)
      );
    }
  }

  async setPasswords(options) {
    if (!(await this.isSecurityEnabled())) {
      this._log.info('security is not enabled, unable to set native realm passwords');
      return;
    }

    (await this.getReservedUsers()).forEach(user => {
      this.setPassword(user, options[`password.${user}`]);
    });
  }

  async getReservedUsers() {
    const users = await this._client.security.getUser();

    return Object.keys(users.body).reduce((acc, user) => {
      if (users.body[user].metadata._reserved === true) {
        acc.push(user);
      }
      return acc;
    }, []);
  }

  async isSecurityEnabled() {
    try {
      const {
        body: { features },
      } = await this._client.xpack.info({ categories: 'features' });
      return features.security && features.security.enabled && features.security.available;
    } catch (e) {
      return false;
    }
  }
};
