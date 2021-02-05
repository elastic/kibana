/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { values } from 'lodash';
import { format as formatUrl } from 'url';
import { Agent as HttpsAgent, AgentOptions } from 'https';

import { WildcardMatcher } from './wildcard_matcher';

export class ProxyConfig {
  // @ts-ignore
  private id: string;
  private matchers: {
    protocol: WildcardMatcher;
    host: WildcardMatcher;
    port: WildcardMatcher;
    path: WildcardMatcher;
  };

  private readonly timeout: number;

  private readonly sslAgent?: HttpsAgent;

  private verifySsl: any;

  constructor(config: { match: any; timeout: number }) {
    config = {
      ...config,
    };

    // -----
    // read "match" info
    // -----
    const rawMatches = {
      ...config.match,
    };
    this.id =
      formatUrl({
        protocol: rawMatches.protocol,
        hostname: rawMatches.host,
        port: rawMatches.port,
        pathname: rawMatches.path,
      }) || '*';

    this.matchers = {
      protocol: new WildcardMatcher(rawMatches.protocol),
      host: new WildcardMatcher(rawMatches.host),
      port: new WildcardMatcher(rawMatches.port),
      path: new WildcardMatcher(rawMatches.path, '/'),
    };

    // -----
    // read config vars
    // -----
    this.timeout = config.timeout;
    this.sslAgent = this._makeSslAgent(config);
  }

  _makeSslAgent(config: any) {
    const ssl = config.ssl || {};
    this.verifySsl = ssl.verify;

    const sslAgentOpts: AgentOptions = {
      ca: ssl.ca,
      cert: ssl.cert,
      key: ssl.key,
    };

    if (values(sslAgentOpts).filter(Boolean).length) {
      sslAgentOpts.rejectUnauthorized = this.verifySsl == null ? true : this.verifySsl;
      return new HttpsAgent(sslAgentOpts);
    }
  }

  getForParsedUri({
    protocol,
    hostname,
    port,
    pathname,
  }: Record<'protocol' | 'hostname' | 'port' | 'pathname', string>) {
    let match = this.matchers.protocol.match(protocol.slice(0, -1));
    match = match && this.matchers.host.match(hostname);
    match = match && this.matchers.port.match(port);
    match = match && this.matchers.path.match(pathname);

    if (!match) return {};
    return {
      timeout: this.timeout,
      rejectUnauthorized: this.sslAgent ? undefined : this.verifySsl,
      agent: protocol === 'https:' ? this.sslAgent : undefined,
    };
  }
}
