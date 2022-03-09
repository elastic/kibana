/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { IExternalUrlPolicy } from 'src/core/server/types';

import { CoreService } from 'src/core/types';
import { IExternalUrl } from './types';
import { InjectedMetadataSetup } from '../injected_metadata';
import { Sha256 } from '../utils';

interface SetupDeps {
  location: Pick<Location, 'href'>;
  injectedMetadata: InjectedMetadataSetup;
}

function* getHostHashes(actualHost: string) {
  yield new Sha256().update(actualHost, 'utf8').digest('hex');
  let host = actualHost.substr(actualHost.indexOf('.') + 1);
  while (host) {
    yield new Sha256().update(host, 'utf8').digest('hex');
    if (host.indexOf('.') === -1) {
      break;
    }
    host = host.substr(host.indexOf('.') + 1);
  }
}

const isHostMatch = (actualHost: string, ruleHostHash: string) => {
  // If the host contains a `[`, then it's likely an IPv6 address. Otherwise, append a `.` if it doesn't already contain one
  const hostToHash =
    !actualHost.includes('[') && !actualHost.endsWith('.') ? `${actualHost}.` : actualHost;
  for (const hash of getHostHashes(hostToHash)) {
    if (hash === ruleHostHash) {
      return true;
    }
  }
  return false;
};

const isProtocolMatch = (actualProtocol: string, ruleProtocol: string) => {
  return normalizeProtocol(actualProtocol) === normalizeProtocol(ruleProtocol);
};

function normalizeProtocol(protocol: string) {
  return protocol.endsWith(':') ? protocol.slice(0, -1).toLowerCase() : protocol.toLowerCase();
}

const createIsInternalUrlValidation = (
  location: Pick<Location, 'href'>,
  serverBasePath: string
) => {
  return function isInternallUrl(next: string) {
    const base = new URL(location.href);
    const url = new URL(next, base);

    return (
      url.origin === base.origin &&
      (!serverBasePath || url.pathname.startsWith(`${serverBasePath}/`))
    );
  };
};

const createExternalUrlValidation = (
  rules: IExternalUrlPolicy[],
  location: Pick<Location, 'href'>,
  serverBasePath: string
) => {
  const isInternalUrl = createIsInternalUrlValidation(location, serverBasePath);

  return function validateExternalUrl(next: string) {
    const base = new URL(location.href);
    const url = new URL(next, base);

    if (isInternalUrl(next)) {
      return url;
    }

    let allowed: null | boolean = null;
    rules.forEach((rule) => {
      const hostMatch = rule.host ? isHostMatch(url.hostname || '', rule.host) : true;

      const protocolMatch = rule.protocol ? isProtocolMatch(url.protocol, rule.protocol) : true;

      const isRuleMatch = hostMatch && protocolMatch;

      if (isRuleMatch && allowed !== false) {
        allowed = rule.allow;
      }
    });

    return allowed === true ? url : null;
  };
};

export class ExternalUrlService implements CoreService<IExternalUrl> {
  setup({ injectedMetadata, location }: SetupDeps): IExternalUrl {
    const serverBasePath = injectedMetadata.getServerBasePath();
    const { policy } = injectedMetadata.getExternalUrlConfig();

    return {
      isInternalUrl: createIsInternalUrlValidation(location, serverBasePath),
      validateUrl: createExternalUrlValidation(policy, location, serverBasePath),
    };
  }

  start() {}

  stop() {}
}
