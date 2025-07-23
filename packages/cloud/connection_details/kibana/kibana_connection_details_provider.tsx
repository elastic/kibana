/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as React from 'react';
import type { CoreStart } from '@kbn/core-lifecycle-browser';
import type { CloudStart } from '@kbn/cloud-plugin/public';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import type { CreateAPIKeyParams, CreateAPIKeyResult } from '@kbn/security-plugin-types-server';
import { ConnectionDetailsOptsProvider } from '../context';
import { ConnectionDetailsOpts } from '../types';
import { useAsyncMemo } from '../hooks/use_async_memo';

const createOpts = async (props: KibanaConnectionDetailsProviderProps) => {
  const { options, start } = props;
  const { http, docLinks } = start.core;
  const locator = start.plugins?.share?.url?.locators.get('MANAGEMENT_APP_LOCATOR');
  const manageKeysLink = await locator?.getUrl({ sectionId: 'security', appId: 'api_keys' });
  const result: ConnectionDetailsOpts = {
    ...options,
    navigateToUrl: start.core.application
      ? (link: string) => {
          props.onNavigation?.();
          start.core.application?.navigateToUrl?.(link);
        }
      : undefined,
    links: {
      learnMore: docLinks.links.fleet.apiKeysLearnMore,
      ...options?.links,
    },
    endpoints: {
      id: start.plugins?.cloud?.cloudId,
      url: start.plugins?.cloud?.elasticsearchUrl,
      ...options?.endpoints,
    },
    apiKeys: {
      manageKeysLink,
      createKey: async ({ name }) => {
        if (!http) {
          throw new Error('HTTP service is not available');
        }

        const request: CreateAPIKeyParams = {
          name,
          expiration: '90d',
          metadata: {},
          role_descriptors: {},
        };

        const response = await http.post<CreateAPIKeyResult>('/internal/security/api_key', {
          body: JSON.stringify(request),
        });

        return {
          apiKey: {
            id: response.id,
            name: response.name,
            key: response.api_key,
            encoded: response.encoded,
          },
        };
      },
      hasPermission: async () => true,
      ...options?.apiKeys,
    },
  };

  return result;
};

export interface KibanaConnectionDetailsProviderProps {
  onNavigation?: () => void;
  options?: ConnectionDetailsOpts;
  start: {
    core: {
      i18n: CoreStart['i18n'];
      docLinks: CoreStart['docLinks'];
      theme: CoreStart['theme'];
      http?: CoreStart['http'];
      application?: CoreStart['application'];
    };
    plugins?: {
      cloud?: CloudStart;
      share?: SharePluginStart;
    };
  };
}

export const KibanaConnectionDetailsProvider: React.FC<KibanaConnectionDetailsProviderProps> = (
  props
) => {
  const opts = useAsyncMemo(
    () => createOpts(props),
    [props.onNavigation, props.options, props.start]
  );

  if (!opts) {
    return null;
  }

  return <ConnectionDetailsOptsProvider {...opts}>{props.children}</ConnectionDetailsOptsProvider>;
};
