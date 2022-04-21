/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { getDocLinksMock, getDocLinksMetaMock } from './doc_links_service.test.mocks';
import { DocLinksService } from './doc_links_service';
import { mockCoreContext } from '../core_context.mock';

describe('DocLinksService', () => {
  let coreContext: ReturnType<typeof mockCoreContext.create>;
  let service: DocLinksService;

  beforeEach(() => {
    getDocLinksMetaMock.mockReturnValue({
      version: 'test-version',
      elasticWebsiteUrl: 'http://elastic.test.url',
    });
    getDocLinksMock.mockReturnValue({
      settings: 'http://settings.test.url',
    });

    coreContext = mockCoreContext.create();
    service = new DocLinksService(coreContext);
  });

  afterEach(() => {
    getDocLinksMock.mockReset();
    getDocLinksMetaMock.mockReset();
  });

  describe('#setup', () => {
    it('calls `getDocLinksMeta` with the correct parameters', () => {
      expect(getDocLinksMetaMock).not.toHaveBeenCalled();

      service.setup();

      expect(getDocLinksMetaMock).toHaveBeenCalledTimes(1);
      expect(getDocLinksMetaMock).toHaveBeenCalledWith({
        kibanaBranch: coreContext.env.packageInfo.branch,
      });
    });

    it('return the values from `getDocLinksMeta`', () => {
      const setup = service.setup();

      expect(setup).toEqual({
        version: 'test-version',
        elasticWebsiteUrl: 'http://elastic.test.url',
        links: expect.any(Object),
      });
    });

    it('calls `getDocLinks` with the correct parameters', () => {
      expect(getDocLinksMock).not.toHaveBeenCalled();

      service.setup();

      expect(getDocLinksMock).toHaveBeenCalledTimes(1);
      expect(getDocLinksMock).toHaveBeenCalledWith({
        kibanaBranch: coreContext.env.packageInfo.branch,
      });
    });

    it('return the values from `getDocLinks`', () => {
      const setup = service.setup();

      expect(setup.links).toEqual({
        settings: 'http://settings.test.url',
      });
    });
  });

  describe('#start', () => {
    it('throws if called before #setup', () => {
      expect(() => service.start()).toThrowErrorMatchingInlineSnapshot(
        `"#setup must be called before #start"`
      );
    });

    it('does not recall underlying functions', () => {
      expect(getDocLinksMock).not.toHaveBeenCalled();
      expect(getDocLinksMetaMock).not.toHaveBeenCalled();

      service.setup();

      expect(getDocLinksMock).toHaveBeenCalledTimes(1);
      expect(getDocLinksMetaMock).toHaveBeenCalledTimes(1);

      service.start();

      expect(getDocLinksMock).toHaveBeenCalledTimes(1);
      expect(getDocLinksMetaMock).toHaveBeenCalledTimes(1);
    });

    it('return the values from `getDocLinks`', () => {
      service.setup();
      const start = service.start();

      expect(start.links).toEqual({
        settings: 'http://settings.test.url',
      });
    });

    it('return the values from `getDocLinksMeta`', () => {
      service.setup();
      const start = service.start();

      expect(start).toEqual({
        version: 'test-version',
        elasticWebsiteUrl: 'http://elastic.test.url',
        links: expect.any(Object),
      });
    });
  });
});
