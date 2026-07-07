/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import chalk from 'chalk';
import type { Client } from '@elastic/elasticsearch';
import type { ToolingLog } from '@kbn/tooling-log';

import { log as defaultLog } from './log';

export const SYSTEM_INDICES_SUPERUSER =
  process.env.TEST_ES_SYSTEM_INDICES_USER || 'system_indices_superuser';

interface RetryOpts {
  attempt?: number;
  maxAttempts?: number;
}

interface NativeRealmOptions {
  elasticPassword: string;
  log?: ToolingLog;
  client: Client;
}

export class NativeRealm {
  private readonly _elasticPassword: string;
  private readonly _client: Client;
  private readonly _log: ToolingLog;

  constructor({ elasticPassword, log = defaultLog, client }: NativeRealmOptions) {
    this._elasticPassword = elasticPassword;
    this._client = client;
    this._log = log;
  }

  async setPassword(
    username: string,
    password: string | undefined = this._elasticPassword,
    retryOpts: RetryOpts = {}
  ) {
    const effectivePassword = password ?? this._elasticPassword;
    await this._autoRetry(retryOpts, async () => {
      try {
        await this._client.security.changePassword({
          username,
          refresh: 'wait_for',
          password: effectivePassword,
        });
      } catch (err: any) {
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

  async setPasswords(options: Record<string, unknown>) {
    if (!(await this.isSecurityEnabled())) {
      this._log.info('security is not enabled, unable to set native realm passwords');
      return;
    }

    const reservedUsers = await this.getReservedUsers();
    this._log.info(`Set up ${reservedUsers.length} ES users`);
    await Promise.all([
      ...reservedUsers.map(async (user) => {
        await this.setPassword(user, options[`password.${user}`] as string | undefined);
      }),
      this._createSystemIndicesUser(),
    ]);
  }

  async getReservedUsers(retryOpts: RetryOpts = {}): Promise<string[]> {
    return await this._autoRetry(retryOpts, async () => {
      const resp = await this._client.security.getUser();
      const usernames = Object.keys(resp).filter(
        (user) => (resp[user] as any).metadata._reserved === true
      );

      if (!usernames?.length) {
        throw new Error('no reserved users found, unable to set native realm passwords');
      }

      return usernames;
    });
  }

  async isSecurityEnabled(retryOpts: RetryOpts = {}): Promise<boolean> {
    try {
      return await this._autoRetry(retryOpts, async () => {
        const { features } = await this._client.xpack.info({ categories: ['features'] });
        const security = (features as any)?.security;
        return Boolean(security && security.enabled && security.available);
      });
    } catch (error: any) {
      if (error.meta && error.meta.statusCode === 400) {
        return false;
      }

      throw error;
    }
  }

  private async _autoRetry<T>(opts: RetryOpts, fn: (attempt: number) => Promise<T>): Promise<T> {
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

      return await this._autoRetry({ ...opts, attempt: attempt + 1 }, fn);
    }
  }

  private async _createSystemIndicesUser() {
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
}
