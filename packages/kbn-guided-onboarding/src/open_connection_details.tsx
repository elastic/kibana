/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as React from 'react';
import ReactDOM from 'react-dom';
import * as conn from '@kbn/cloud/connection_details';
import { KibanaRenderContextProvider } from '@kbn/react-kibana-context-render';
import type { CoreStart } from '@kbn/core-lifecycle-browser';
import type { BrowserUrlService } from '@kbn/share-plugin/public';

export interface OpenConnectionDetailsParams {
  options: {
    endpoints?: conn.ConnectionDetailsOpts['endpoints'];
  };
  dependencies: {
    i18n: CoreStart['i18n'];
    docLinks: CoreStart['docLinks'];
    overlays: CoreStart['overlays'];
    theme: CoreStart['theme'];
    http?: CoreStart['http'];
    url?: BrowserUrlService;
    navigateToUrl?: (url: string) => void;
  };
}

export const openConnectionDetails = async ({
  options,
  dependencies,
}: OpenConnectionDetailsParams) => {
  const { http, docLinks, url } = dependencies;
  const locator = url?.locators.get('MANAGEMENT_APP_LOCATOR');
  const manageKeysLink = await locator?.getUrl({ sectionId: 'security', appId: 'api_keys' });
  const opts: conn.ConnectionDetailsOpts = {
    navigateToUrl: (link: string) => {
      if (flyoutRef) flyoutRef.close();
      dependencies.navigateToUrl?.(link);
    },
    links: {
      learnMore: docLinks.links.fleet.apiKeysLearnMore,
    },
    endpoints: options.endpoints,
    apiKeys: {
      manageKeysLink,
      createKey: async ({ name }) => {
        if (!http) {
          throw new Error('HTTP service is not available');
        }

        interface KeyResponse {
          id: string;
          name: string;
          expiration: number;
          api_key: string;
          encoded: string;
        }

        const response = await http.post<KeyResponse>('/internal/security/api_key', {
          body: JSON.stringify({
            name,
            expiration: '90d',
            metadata: '{}',
            role_descriptors: '{}',
          }),
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
    },
  };
  const mount = (element: HTMLElement) => {
    const reactElement = (
      <KibanaRenderContextProvider i18n={dependencies.i18n} theme={dependencies.theme}>
        <conn.ConnectionDetailsOptsProvider {...opts}>
          <conn.ConnectionDetailsFlyoutContent />
        </conn.ConnectionDetailsOptsProvider>
      </KibanaRenderContextProvider>
    );
    ReactDOM.render(reactElement, element);

    return () => ReactDOM.unmountComponentAtNode(element);
  };
  const flyoutRef = dependencies.overlays.openFlyout(mount, { size: 's' });

  return flyoutRef;
};
