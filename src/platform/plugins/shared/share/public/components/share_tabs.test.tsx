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
import { ShareMenuProvider, type IShareContext } from './context';
import { mountWithIntl } from '@kbn/test-jest-helpers';
import { KibanaLocation, LocatorGetUrlParams, UrlService } from '../../common/url_service';
import {
  BrowserShortUrlClient,
  BrowserShortUrlClientHttp,
} from '../url_service/short_urls/short_url_client';
import {
  BrowserShortUrlClientFactoryCreateParams,
  BrowserShortUrlClientFactory,
} from '../url_service/short_urls/short_url_client_factory';
import { themeServiceMock } from '@kbn/core-theme-browser-mocks';
import { i18nServiceMock } from '@kbn/core-i18n-browser-mocks';
import { toastsServiceMock } from '@kbn/core-notifications-browser-mocks/src/toasts_service.mock';
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
  ],
  allowShortUrl: true,
  theme: themeServiceMock.createStartContract(),
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
  toasts: toastsServiceMock.createStartContract(),
  i18n: i18nServiceMock.createStartContract(),
};

const mockGenerateExport = jest.fn();
const mockGenerateExportUrl = jest.fn().mockImplementation(() => 'generated-export-url');
const CSV = 'CSV' as const;
const PNG = 'PNG' as const;

describe('Share modal tabs', () => {
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

      const wrapper = mountWithIntl(
        <ShareMenuProvider shareContext={{ ...disabledLinkShareContext }}>
          <ShareMenuTabs />
        </ShareMenuProvider>
      );
      expect(wrapper.find('[data-test-subj="link"]').exists()).toBeFalsy();
    });
  });

  describe('export tab', () => {
    it('should render export tab when there are share menu items that are not disabled', async () => {
      const shareContextWithConfiguredExportItem: IShareContext = {
        ...mockShareContext,
        shareMenuItems: [
          ...mockShareContext.shareMenuItems,
          {
            id: 'test-export',
            shareType: 'integration',
            groupId: 'export',
            config: {
              name: 'test',
              disabled: false,
              label: CSV,
              generateExport: mockGenerateExport,
              generateExportUrl: mockGenerateExportUrl,
            },
          },
        ],
      };

      const wrapper = mountWithIntl(
        <ShareMenuProvider shareContext={{ ...shareContextWithConfiguredExportItem }}>
          <ShareMenuTabs />
        </ShareMenuProvider>
      );
      expect(wrapper.find('[data-test-subj="export"]').exists()).toBeTruthy();
    });

    it('should not render export tab when it has only one item configured as disabled', async () => {
      const shareContextWithConfiguredExportItem: IShareContext = {
        ...mockShareContext,
        shareMenuItems: [
          ...mockShareContext.shareMenuItems,
          {
            id: 'test-export',
            shareType: 'integration',
            groupId: 'export',
            config: {
              name: 'test',
              disabled: true,
              label: CSV,
              generateExport: mockGenerateExport,
              generateExportUrl: mockGenerateExportUrl,
            },
          },
        ],
      };

      const wrapper = mountWithIntl(
        <ShareMenuProvider shareContext={{ ...shareContextWithConfiguredExportItem }}>
          <ShareMenuTabs />
        </ShareMenuProvider>
      );

      expect(wrapper.find('[data-test-subj="export"]').exists()).toBeFalsy();
    });

    it('would render the export tab when there is at least one export type which is not disabled', async () => {
      const shareContextWithConfiguredExportItem: IShareContext = {
        ...mockShareContext,
        shareMenuItems: [
          ...mockShareContext.shareMenuItems,
          {
            id: 'test-csv-export',
            shareType: 'integration',
            groupId: 'export',
            config: {
              name: 'test',
              disabled: false,
              label: CSV,
              generateExport: mockGenerateExport,
              generateExportUrl: mockGenerateExportUrl,
            },
          },
          {
            id: 'test-png-export',
            shareType: 'integration',
            groupId: 'export',
            config: {
              name: 'test',
              disabled: true,
              label: PNG,
              generateExport: mockGenerateExport,
              generateExportUrl: mockGenerateExportUrl,
            },
          },
        ],
      };

      const wrapper = mountWithIntl(
        <ShareMenuProvider shareContext={{ ...shareContextWithConfiguredExportItem }}>
          <ShareMenuTabs />
        </ShareMenuProvider>
      );
      expect(wrapper.find('[data-test-subj="export"]').exists()).toBeTruthy();
    });
  });
});
