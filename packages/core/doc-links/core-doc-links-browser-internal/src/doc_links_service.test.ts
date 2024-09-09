/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getDocLinksMock, getDocLinksMetaMock } from './doc_links_service.test.mocks';
import { coreContextMock } from '@kbn/core-base-browser-mocks';
import { DocLinksService } from './doc_links_service';
import { injectedMetadataServiceMock } from '@kbn/core-injected-metadata-browser-mocks';

describe('DocLinksService', () => {
  let injectedMetadata: ReturnType<typeof injectedMetadataServiceMock.createStartContract>;
  let coreContext: ReturnType<typeof coreContextMock.create>;
  let service: DocLinksService;

  beforeEach(() => {
    injectedMetadata = injectedMetadataServiceMock.createStartContract();
    injectedMetadata.getKibanaBranch.mockReturnValue('test-branch');

    getDocLinksMetaMock.mockReturnValue({
      version: 'test-version',
      elasticWebsiteUrl: 'http://elastic.test.url',
    });
    getDocLinksMock.mockReturnValue({
      settings: 'http://settings.test.url',
    });

    coreContext = coreContextMock.create();
    service = new DocLinksService(coreContext);
  });

  afterEach(() => {
    getDocLinksMock.mockReset();
    getDocLinksMetaMock.mockReset();
  });

  describe('#start', () => {
    it('calls `getDocLinksMeta` with the correct parameters', () => {
      expect(getDocLinksMetaMock).not.toHaveBeenCalled();

      service.start({ injectedMetadata });

      expect(getDocLinksMetaMock).toHaveBeenCalledTimes(1);
      expect(getDocLinksMetaMock).toHaveBeenCalledWith({
        kibanaBranch: 'test-branch',
        buildFlavor: coreContext.env.packageInfo.buildFlavor,
      });
    });

    it('return the values from `getDocLinksMeta`', () => {
      const start = service.start({ injectedMetadata });

      expect(start).toEqual({
        DOC_LINK_VERSION: 'test-version',
        ELASTIC_WEBSITE_URL: 'http://elastic.test.url',
        links: expect.any(Object),
      });
    });

    it('calls `getDocLinks` with the correct parameters', () => {
      expect(getDocLinksMock).not.toHaveBeenCalled();

      service.start({ injectedMetadata });

      expect(getDocLinksMock).toHaveBeenCalledTimes(1);
      expect(getDocLinksMock).toHaveBeenCalledWith({
        kibanaBranch: 'test-branch',
        buildFlavor: coreContext.env.packageInfo.buildFlavor,
      });
    });

    it('return the values from `getDocLinks`', () => {
      const start = service.start({ injectedMetadata });

      expect(start.links).toEqual({
        settings: 'http://settings.test.url',
      });
    });
  });
});
