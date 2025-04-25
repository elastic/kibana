/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { ShareMenuTabs } from './share_tabs';
import { ShareMenuProvider } from './context';
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
const mockShareContext = {
  allowEmbed: true,
  allowShortUrl: true,
  anonymousAccess: { getCapabilities: jest.fn(), getState: jest.fn() },
  urlService: service,
  theme: themeServiceMock.createStartContract(),
  objectTypeMeta: { title: 'title' },
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
  it('should render export tab when there are share menu items that are not disabled', async () => {
    const testItem = [
      {
        shareMenuItem: { name: 'test', disabled: false },
        label: CSV,
        generateExport: mockGenerateExport,
        generateExportUrl: mockGenerateExportUrl,
      },
    ];
    const wrapper = mountWithIntl(
      <ShareMenuProvider shareContext={{ ...mockShareContext, shareMenuItems: testItem }}>
        <ShareMenuTabs />
      </ShareMenuProvider>
    );
    expect(wrapper.find('[data-test-subj="export"]').exists()).toBeTruthy();
  });

  it('should render export tab is at least one is not disabled', async () => {
    const testItem = [
      {
        shareMenuItem: { name: 'test', disabled: false },
        label: CSV,
        generateExport: mockGenerateExport,
        generateExportUrl: mockGenerateExportUrl,
      },
      {
        shareMenuItem: { name: 'test', disabled: true },
        label: PNG,
        generateExport: mockGenerateExport,
        generateExportUrl: mockGenerateExportUrl,
      },
    ];
    const wrapper = mountWithIntl(
      <ShareMenuProvider shareContext={{ ...mockShareContext, shareMenuItems: testItem }}>
        <ShareMenuTabs />
      </ShareMenuProvider>
    );
    expect(wrapper.find('[data-test-subj="export"]').exists()).toBeTruthy();
  });
});
