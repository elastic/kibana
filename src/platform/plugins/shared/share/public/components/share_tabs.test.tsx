/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { ShareMenuTabs } from './share_tabs';
import { ShareProvider, type IShareContext } from './context';
import { screen, render } from '@testing-library/react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { KibanaLocation, LocatorGetUrlParams, UrlService } from '../../common/url_service';
import {
  BrowserShortUrlClient,
  BrowserShortUrlClientHttp,
} from '../url_service/short_urls/short_url_client';
import {
  BrowserShortUrlClientFactoryCreateParams,
  BrowserShortUrlClientFactory,
} from '../url_service/short_urls/short_url_client_factory';
const navigate = jest.fn(async () => {});
const getUrl = jest.fn(
  async (location: KibanaLocation, params: LocatorGetUrlParams): Promise<string> => {
    return `${params.absolute ? 'https://example.com' : ''}/xyz/${location.app}/${location.path}`;
  }
);
const http: BrowserShortUrlClientHttp = {
  basePath: {
    get: () => '/xyz',
  },
  fetch: jest.fn(async () => {
    return {} as any;
  }),
};
const service = new UrlService<BrowserShortUrlClientFactoryCreateParams, BrowserShortUrlClient>({
  baseUrl: '/xyz',
  version: '1.2.3',
  navigate,
  getUrl,
  shortUrls: ({ locators }) =>
    new BrowserShortUrlClientFactory({
      http,
      locators,
    }),
});

const mockShareContext: IShareContext = {
  shareMenuItems: [
    {
      shareType: 'link',
      config: {
        shortUrlService: service.shortUrls.get(null),
      },
    },
    {
      shareType: 'embed',
      config: {
        shortUrlService: service.shortUrls.get(null),
        anonymousAccess: { getCapabilities: jest.fn(), getState: jest.fn() },
      },
    },
    {
      shareType: 'integration',
      groupId: 'export',
      id: 'csv',
      config: {
        icon: 'empty',
        label: 'CSV',
      },
    },
  ],
  allowShortUrl: true,
  objectTypeMeta: {
    title: 'title',
    config: {
      embed: {
        disabled: false,
      },
    },
  },
  objectType: 'type',
  sharingData: { title: 'title', url: 'url' },
  isDirty: false,
  onClose: jest.fn(),
};

describe('Share modal tabs', () => {
  it('does not render an export tab', () => {
    render(
      <IntlProvider locale="en">
        <ShareProvider shareContext={{ ...mockShareContext }}>
          <ShareMenuTabs />
        </ShareProvider>
      </IntlProvider>
    );
    expect(screen.queryByTestId('export')).not.toBeInTheDocument();
  });

  describe('link tab', () => {
    it('should not render the link tab when it is configured as disabled', async () => {
      const disabledLinkShareContext = {
        ...mockShareContext,
        objectTypeMeta: {
          ...mockShareContext.objectTypeMeta,
          config: {
            ...mockShareContext.objectTypeMeta.config,
            link: {
              disabled: true,
            },
          },
        },
      };

      render(
        <IntlProvider locale="en">
          <ShareProvider shareContext={{ ...disabledLinkShareContext }}>
            <ShareMenuTabs />
          </ShareProvider>
        </IntlProvider>
      );
      expect(screen.queryByTestId('link')).not.toBeInTheDocument();
    });
  });
});
