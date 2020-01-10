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

import { i18n } from '@kbn/i18n';
import rison, { RisonObject } from 'rison-node';
import { stringify as stringifyQueryString } from 'querystring';
import encodeUriQuery from 'encode-uri-query';
import { format as formatUrl, parse as parseUrl } from 'url';
import { hashedItemStore } from '../../storage/hashed_item_store';
import { createStateHash, isStateHash } from '../state_hash';

export type IParsedUrlQuery = Record<string, any>;

interface IUrlQueryMapperOptions {
  hashableParams: string[];
}
export type IUrlQueryReplacerOptions = IUrlQueryMapperOptions;

export const unhashQuery = createQueryMapper(stateHashToRisonState);
export const hashQuery = createQueryMapper(risonStateToStateHash);

export const unhashUrl = createQueryReplacer(unhashQuery);
export const hashUrl = createQueryReplacer(hashQuery);

// naive hack, but this allows to decouple these utils from AppState, GlobalState for now
// when removing AppState, GlobalState and migrating to IState containers,
// need to make sure that apps explicitly passing this whitelist to hash
const __HACK_HARDCODED_LEGACY_HASHABLE_PARAMS = ['_g', '_a', '_s'];
function createQueryMapper(queryParamMapper: (q: string) => string | null) {
  return (
    query: IParsedUrlQuery,
    options: IUrlQueryMapperOptions = {
      hashableParams: __HACK_HARDCODED_LEGACY_HASHABLE_PARAMS,
    }
  ) =>
    Object.fromEntries(
      Object.entries(query || {}).map(([name, value]) => {
        if (!options.hashableParams.includes(name)) return [name, value];
        return [name, queryParamMapper(value) || value];
      })
    );
}

function createQueryReplacer(
  queryMapper: (q: IParsedUrlQuery, options?: IUrlQueryMapperOptions) => IParsedUrlQuery,
  options?: IUrlQueryReplacerOptions
) {
  return (url: string) => {
    if (!url) return url;

    const parsedUrl = parseUrl(url, true);
    if (!parsedUrl.hash) return url;

    const appUrl = parsedUrl.hash.slice(1); // trim the #
    if (!appUrl) return url;

    const appUrlParsed = parseUrl(appUrl, true);
    if (!appUrlParsed.query) return url;

    const changedAppQuery = queryMapper(appUrlParsed.query, options);

    // encodeUriQuery implements the less-aggressive encoding done naturally by
    // the browser. We use it to generate the same urls the browser would
    const changedAppQueryString = stringifyQueryString(changedAppQuery, undefined, undefined, {
      encodeURIComponent: encodeUriQuery,
    });

    return formatUrl({
      ...parsedUrl,
      hash: formatUrl({
        pathname: appUrlParsed.pathname,
        search: changedAppQueryString,
      }),
    });
  };
}

// TODO: this helper should be merged with or replaced by
// src/legacy/ui/public/state_management/state_storage/hashed_item_store.ts
// maybe to become simplified stateless version
export function retrieveState(stateHash: string): RisonObject {
  const json = hashedItemStore.getItem(stateHash);
  const throwUnableToRestoreUrlError = () => {
    throw new Error(
      i18n.translate('kibana_utils.stateManagement.url.unableToRestoreUrlErrorMessage', {
        defaultMessage:
          'Unable to completely restore the URL, be sure to use the share functionality.',
      })
    );
  };
  if (json === null) {
    return throwUnableToRestoreUrlError();
  }
  try {
    return JSON.parse(json);
  } catch (e) {
    return throwUnableToRestoreUrlError();
  }
}

// TODO: this helper should be merged with or replaced by
// src/legacy/ui/public/state_management/state_storage/hashed_item_store.ts
// maybe to become simplified stateless version
export function persistState(state: RisonObject): string {
  const json = JSON.stringify(state);
  const hash = createStateHash(json);

  const isItemSet = hashedItemStore.setItem(hash, json);
  if (isItemSet) return hash;
  // If we ran out of space trying to persist the state, notify the user.
  const message = i18n.translate(
    'kibana_utils.stateManagement.url.unableToStoreHistoryInSessionErrorMessage',
    {
      defaultMessage:
        'Kibana is unable to store history items in your session ' +
        `because it is full and there don't seem to be items any items safe ` +
        'to delete.\n\n' +
        'This can usually be fixed by moving to a fresh tab, but could ' +
        'be caused by a larger issue. If you are seeing this message regularly, ' +
        'please file an issue at {gitHubIssuesUrl}.',
      values: { gitHubIssuesUrl: 'https://github.com/elastic/kibana/issues' },
    }
  );
  throw new Error(message);
}

function stateHashToRisonState(stateHashOrRison: string): string {
  if (isStateHash(stateHashOrRison)) {
    return rison.encode(retrieveState(stateHashOrRison));
  }

  return stateHashOrRison;
}

function risonStateToStateHash(stateHashOrRison: string): string | null {
  if (isStateHash(stateHashOrRison)) {
    return stateHashOrRison;
  }

  return persistState(rison.decode(stateHashOrRison) as RisonObject);
}
