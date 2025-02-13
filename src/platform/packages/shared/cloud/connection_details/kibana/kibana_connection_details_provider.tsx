/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
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
  const { http, docLinks, analytics } = start.core;
  const locator = start.plugins?.share?.url?.locators.get('MANAGEMENT_APP_LOCATOR');
  const manageKeysLink = await locator?.getUrl({ sectionId: 'security', appId: 'api_keys' });
  const elasticsearchConfig = await start.plugins?.cloud?.fetchElasticsearchConfig();
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
      url: elasticsearchConfig?.elasticsearchUrl,
      cloudIdLearMoreLink: docLinks?.links?.cloud?.beatsAndLogstashConfiguration,
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
    onTelemetryEvent: (event) => {
      if (!analytics) return;
      switch (event[0]) {
        case 'learn_more_clicked': {
          analytics.reportEvent('connection_details_learn_more_clicked', {});
          break;
        }
        case 'tab_switched': {
          analytics.reportEvent('connection_details_tab_switched', { tab: event[1]!.tab });
          break;
        }
        case 'copy_endpoint_url_clicked': {
          analytics.reportEvent('connection_details_copy_endpoint_url_clicked', {});
          break;
        }
        case 'show_cloud_id_toggled': {
          analytics.reportEvent('connection_details_show_cloud_id_toggled', {});
          break;
        }
        case 'copy_cloud_id_clicked': {
          analytics.reportEvent('connection_details_copy_cloud_id_clicked', {});
          break;
        }
        case 'new_api_key_created': {
          analytics.reportEvent('connection_details_new_api_key_created', {});
          break;
        }
        case 'manage_api_keys_clicked': {
          analytics.reportEvent('connection_details_manage_api_keys_clicked', {});
          break;
        }
        case 'key_encoding_changed': {
          analytics.reportEvent('connection_details_key_encoding_changed', {
            format: event[1]!.format,
          });
          break;
        }
        case 'copy_api_key_clicked': {
          analytics.reportEvent('connection_details_copy_api_key_clicked', {
            format: event[1]!.format,
          });
          break;
        }
      }
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
      analytics?: CoreStart['analytics'];
    };
    plugins?: {
      cloud?: CloudStart;
      share?: SharePluginStart;
    };
  };
}

export const KibanaConnectionDetailsProvider: React.FC<
  React.PropsWithChildren<KibanaConnectionDetailsProviderProps>
> = (props) => {
  const opts = useAsyncMemo(
    () => createOpts(props),
    [props.onNavigation, props.options, props.start]
  );

  if (!opts) {
    return null;
  }

  return <ConnectionDetailsOptsProvider {...opts}>{props.children}</ConnectionDetailsOptsProvider>;
};
