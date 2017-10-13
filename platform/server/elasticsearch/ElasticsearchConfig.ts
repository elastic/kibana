import * as url from 'url';
import { ConfigOptions } from 'elasticsearch';
import { readFileSync } from 'fs';
import { noop } from 'lodash';

import { ClusterSchema } from './schema';
import { pick, assertNever } from '../../lib/utils';

// TODO This can't be specified like this
export type ElasticsearchClusterType = 'data' | 'admin';

export class ElasticsearchConfig {
  requestHeadersWhitelist: string[];

  /**
   * @internal
   */
  constructor(
    readonly clusterType: ElasticsearchClusterType,
    private readonly config: ClusterSchema
  ) {
    this.requestHeadersWhitelist = config.requestHeadersWhitelist;
  }

  /**
   * Config for Elasticsearch client, e.g.
   *
   * ```
   * new elasticsearch.Client(config.toElasticsearchClientConfig())
   * ```
   *
   * @param shouldAuth Whether or not to the config should include the username
   *                   and password. Used to create a client that is not
   *                   authenticated using the config, but from each request.
   */
  toElasticsearchClientConfig({ shouldAuth = true } = {}): ConfigOptions {
    const config: ConfigOptions = pick(this.config, [
      'apiVersion',
      'username',
      'logQueries'
    ]);

    config.pingTimeout = this.config.pingTimeout.asMilliseconds();
    config.requestTimeout = this.config.requestTimeout.asMilliseconds();

    config.keepAlive = true;

    const uri = url.parse(this.config.url);

    config.host = {
      host: uri.hostname,
      port: uri.port,
      protocol: uri.protocol,
      path: uri.pathname,
      query: uri.query,
      headers: this.config.customHeaders
    };

    if (
      shouldAuth &&
      this.config.username !== undefined &&
      this.config.password !== undefined
    ) {
      config.host.auth = `${this.config.username}:${this.config.password}`;
    }

    if (this.config.ssl === undefined) {
      return config;
    }

    let ssl: { [key: string]: any } = {};
    if (this.config.ssl.certificate && this.config.ssl.key) {
      ssl = {
        cert: readFileSync(this.config.ssl.certificate),
        key: readFileSync(this.config.ssl.key),
        passphrase: this.config.ssl.keyPassphrase
      };
    }

    const verificationMode = this.config.ssl.verificationMode;

    switch (verificationMode) {
      case 'none':
        ssl.rejectUnauthorized = false;
        break;
      case 'certificate':
        ssl.rejectUnauthorized = true;

        // by default NodeJS checks the server identify
        ssl.checkServerIdentity = noop;
        break;
      case 'full':
        ssl.rejectUnauthorized = true;
        break;
      default:
        assertNever(verificationMode);
    }

    const ca = this.config.ssl.certificateAuthorities;
    if (ca && ca.length > 0) {
      ssl.ca = ca.map(authority => readFileSync(authority));
    }

    config.ssl = ssl;

    return config;
  }
}
