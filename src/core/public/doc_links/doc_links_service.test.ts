/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { getDocLinksMock, getDocLinksMetaMock } from './doc_links_service.test.mocks';
import { DocLinksService } from './doc_links_service';
import { injectedMetadataServiceMock } from '../injected_metadata/injected_metadata_service.mock';

describe('DocLinksService', () => {
  let injectedMetadata: ReturnType<typeof injectedMetadataServiceMock.createStartContract>;
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

    service = new DocLinksService();
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
