/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Url from 'url';

import { ToolingLog } from '@kbn/tooling-log';
import Supertest from 'supertest';

import { KbnClient } from '../../kbn_client';
import { Config } from './config';
import { getKibanaCliArg } from '../../functional_tests/lib/kibana_cli_args';

export class DedicatedTaskRunner {
  static getPort(uiPort: number) {
    return uiPort + 13;
  }

  static getUuid(mainUuid: string) {
    if (mainUuid.length !== 36) {
      throw new Error(`invalid mainUuid: ${mainUuid}`);
    }

    return `00000000-${mainUuid.slice(9)}`;
  }

  /**
   * True when the FTR config indicates that Kibana has a dedicated task runner process, otherwise false. If this
   * property is false then all other methods on this class will throw when they are called, so if you're not
   * certain where your code will be run make sure to check `dedicatedTaskRunner.enabled` before calling
   * other methods.
   */
  public readonly enabled: boolean;

  private readonly enabledProps?: {
    readonly port: number;
    readonly url: string;
    readonly client: KbnClient;
    readonly uuid?: string;
    readonly supertest?: Supertest.SuperTest<Supertest.Test>;
  };

  constructor(config: Config, log: ToolingLog) {
    if (!config.get('kbnTestServer.useDedicatedTaskRunner')) {
      this.enabled = false;
      return;
    }

    this.enabled = true;

    const port = DedicatedTaskRunner.getPort(config.get('servers.kibana.port'));
    const url = Url.format({
      ...config.get('servers.kibana'),
      port,
    });
    const client = new KbnClient({
      log,
      url,
      certificateAuthorities: config.get('servers.kibana.certificateAuthorities'),
      uiSettingDefaults: config.get('uiSettings.defaults'),
    });

    const mainUuid = getKibanaCliArg(config.get('kbnTestServer.serverArgs'), 'server.uuid');
    const uuid = typeof mainUuid === 'string' ? DedicatedTaskRunner.getUuid(mainUuid) : undefined;

    this.enabledProps = { port, url, client, uuid };
  }

  private getEnabledProps() {
    if (!this.enabledProps) {
      throw new Error(
        `DedicatedTaskRunner is not enabled, check the "enabled" property before calling getters assuming it is enabled.`
      );
    }

    return this.enabledProps;
  }

  /**
   * The port number that the dedicated task runner is running on
   */
  getPort() {
    return this.getEnabledProps().port;
  }

  /**
   * The full URL for the dedicated task runner process
   */
  getUrl() {
    return this.getEnabledProps().url;
  }

  /**
   * Returns true if the `--server.uuid` setting was passed to the Kibana server, allowing the UUID to
   * be deterministic and ensuring that `dedicatedTaskRunner.getUuid()` won't throw.
   */
  hasUuid() {
    return !!this.getEnabledProps().uuid;
  }

  /**
   * If `--server.uuid` is passed to Kibana in the FTR config file then the dedicated task runner will
   * use a UUID derived from that and it will be synchronously available to users via this function.
   * Otherwise this function will through.
   */
  getUuid() {
    const uuid = this.getEnabledProps().uuid;
    if (!uuid) {
      throw new Error(
        'Pass `--server.uuid` the the Kibana server in your FTR config in order to make the UUID of the dedicated task runner deterministic.'
      );
    }

    return uuid;
  }

  /**
   * @returns a `KbnClient` instance that is configured to talk directly to the dedicated task runner. Not really sure how useful this is.
   */
  getClient() {
    return this.getEnabledProps().client;
  }

  /**
   * @returns a Supertest instance that will send requests to the dedicated task runner.
   *
   * @example
   *  const supertest = dedicatedTaskRunner.getSupertest();
   *  const response = await supertest.get('/status');
   */
  getSupertest() {
    return Supertest(this.getUrl());
  }
}
