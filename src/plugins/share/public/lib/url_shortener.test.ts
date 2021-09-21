/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { shortenUrl } from './url_shortener';

describe('Url shortener', () => {
  const shareId = 'id123';

  let postStub: jest.Mock;
  beforeEach(() => {
    postStub = jest.fn(() => Promise.resolve({ id: shareId }));
  });

  describe('Shorten without base path', () => {
    it('should shorten urls with a port', async () => {
      const shortUrl = await shortenUrl('http://localhost:5601/app/kibana#123', {
        basePath: '',
        post: postStub,
      });
      expect(shortUrl).toBe(`http://localhost:5601/goto/${shareId}`);
    });

    it('should shorten urls without a port', async () => {
      const shortUrl = await shortenUrl('http://localhost/app/kibana#123', {
        basePath: '',
        post: postStub,
      });
      expect(shortUrl).toBe(`http://localhost/goto/${shareId}`);
    });
  });

  describe('Shorten with base path', () => {
    const basePath = '/foo';

    it('should shorten urls with a port', async () => {
      const shortUrl = await shortenUrl(`http://localhost:5601${basePath}/app/kibana#123`, {
        basePath,
        post: postStub,
      });
      expect(shortUrl).toBe(`http://localhost:5601${basePath}/goto/${shareId}`);
    });

    it('should shorten urls without a port', async () => {
      const shortUrl = await shortenUrl(`http://localhost${basePath}/app/kibana#123`, {
        basePath,
        post: postStub,
      });
      expect(shortUrl).toBe(`http://localhost${basePath}/goto/${shareId}`);
    });

    it('should shorten urls with a query string', async () => {
      const shortUrl = await shortenUrl(`http://localhost${basePath}/app/kibana?foo#123`, {
        basePath,
        post: postStub,
      });
      expect(shortUrl).toBe(`http://localhost${basePath}/goto/${shareId}`);
    });

    it('should shorten urls without a hash', async () => {
      const shortUrl = await shortenUrl(`http://localhost${basePath}/app/kibana`, {
        basePath,
        post: postStub,
      });
      expect(shortUrl).toBe(`http://localhost${basePath}/goto/${shareId}`);
    });

    it('should shorten urls with a query string in the hash', async () => {
      const relativeUrl =
        '/app/discover#/?_g=(refreshInterval:(pause:!f,value:0),time:(from:now-15m,mode:quick,to:now))&_a=(columns:!(_source),index:%27logstash-*%27,interval:auto,query:(query_string:(analyze_wildcard:!t,query:%27*%27)),sort:!(%27@timestamp%27,desc))';
      const shortUrl = await shortenUrl(`http://localhost${basePath}${relativeUrl}`, {
        basePath,
        post: postStub,
      });
      expect(shortUrl).toBe(`http://localhost${basePath}/goto/${shareId}`);
    });
  });
});
