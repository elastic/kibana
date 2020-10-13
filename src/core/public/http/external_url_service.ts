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

import { IExternalUrlPolicy } from 'src/core/server/types';

import { CoreService } from 'src/core/types';
import { InjectedMetadataSetup } from '../injected_metadata';
import { IExternalUrl } from './types';

interface SetupDeps {
  location: Pick<Location, 'origin'>;
  injectedMetadata: InjectedMetadataSetup;
}

const isHostMatch = (actualHost: string, ruleHost: string) => {
  const hostParts = actualHost.split('.').reverse();
  const ruleParts = ruleHost.split('.').reverse();

  return ruleParts.every((part, idx) => part === hostParts[idx]);
};

const isProtocolMatch = (actualProtocol: string, ruleProtocol: string) => {
  return normalizeProtocol(actualProtocol) === normalizeProtocol(ruleProtocol);
};

function normalizeProtocol(protocol: string) {
  return protocol.endsWith(':') ? protocol.slice(0, -1).toLowerCase() : protocol.toLowerCase();
}

const createExternalUrlValidation = (
  rules: IExternalUrlPolicy[],
  location: Pick<Location, 'origin'>,
  serverBasePath: string
) => {
  const base = new URL(location.origin + serverBasePath);
  return function validateExternalUrl(next: string) {
    const url = new URL(next, base);

    const isInternalURL =
      url.origin === base.origin &&
      (!serverBasePath || url.pathname.startsWith(`${serverBasePath}/`));

    if (isInternalURL) {
      return url;
    }

    // Accumulator has three potential values here:
    // True => allow request, don't check other rules
    // False => reject request, don't check other rules
    // Undefined => Not yet known, proceed to next rule
    const allowed = rules.reduce((result: boolean | undefined, rule) => {
      if (typeof result === 'boolean') {
        return result;
      }

      const hostMatch = rule.host ? isHostMatch(url.hostname || '', rule.host) : true;

      const protocolMatch = rule.protocol ? isProtocolMatch(url.protocol, rule.protocol) : true;

      const isRuleMatch = hostMatch && protocolMatch;

      return isRuleMatch ? rule.allow : undefined;
    }, undefined);

    return allowed === true ? url : null;
  };
};

export class ExternalUrlService implements CoreService<IExternalUrl> {
  setup({ injectedMetadata, location }: SetupDeps): IExternalUrl {
    const serverBasePath = injectedMetadata.getServerBasePath();
    const { policy } = injectedMetadata.getExternalUrlConfig();

    return {
      validateUrl: createExternalUrlValidation(policy, location, serverBasePath),
    };
  }

  start() {}

  stop() {}
}
