/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { shortenUrl } from './url_shortener';

describe('Url shortener', () => {
  const shareId = 'id123';

  let postStub: jest.Mock;
  beforeEach(() => {
    postStub = jest.fn(() => Promise.resolve({ urlId: shareId }));
  });

  describe('Shorten without base path', () => {
    it('should shorten urls with a port', async () => {
      const shortUrl = await shortenUrl('http://localhost:5601/app/kibana#123', {
        basePath: '',
        post: postStub,
      });
      expect(shortUrl).toBe(`http://localhost:5601/goto/${shareId}`);
      expect(postStub).toHaveBeenCalledWith(`/api/shorten_url`, {
        body: '{"url":"/app/kibana#123"}',
      });
    });

    it('should shorten urls without a port', async () => {
      const shortUrl = await shortenUrl('http://localhost/app/kibana#123', {
        basePath: '',
        post: postStub,
      });
      expect(shortUrl).toBe(`http://localhost/goto/${shareId}`);
      expect(postStub).toHaveBeenCalledWith(`/api/shorten_url`, {
        body: '{"url":"/app/kibana#123"}',
      });
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
      expect(postStub).toHaveBeenCalledWith(`/api/shorten_url`, {
        body: '{"url":"/app/kibana#123"}',
      });
    });

    it('should shorten urls without a port', async () => {
      const shortUrl = await shortenUrl(`http://localhost${basePath}/app/kibana#123`, {
        basePath,
        post: postStub,
      });
      expect(shortUrl).toBe(`http://localhost${basePath}/goto/${shareId}`);
      expect(postStub).toHaveBeenCalledWith(`/api/shorten_url`, {
        body: '{"url":"/app/kibana#123"}',
      });
    });

    it('should shorten urls with a query string', async () => {
      const shortUrl = await shortenUrl(`http://localhost${basePath}/app/kibana?foo#123`, {
        basePath,
        post: postStub,
      });
      expect(shortUrl).toBe(`http://localhost${basePath}/goto/${shareId}`);
      expect(postStub).toHaveBeenCalledWith(`/api/shorten_url`, {
        body: '{"url":"/app/kibana?foo#123"}',
      });
    });

    it('should shorten urls without a hash', async () => {
      const shortUrl = await shortenUrl(`http://localhost${basePath}/app/kibana`, {
        basePath,
        post: postStub,
      });
      expect(shortUrl).toBe(`http://localhost${basePath}/goto/${shareId}`);
      expect(postStub).toHaveBeenCalledWith(`/api/shorten_url`, {
        body: '{"url":"/app/kibana"}',
      });
    });

    it('should shorten urls with a query string in the hash', async () => {
      const relativeUrl =
        '/app/kibana#/discover?_g=(refreshInterval:(pause:!f,value:0),time:(from:now-15m,mode:quick,to:now))&_a=(columns:!(_source),index:%27logstash-*%27,interval:auto,query:(query_string:(analyze_wildcard:!t,query:%27*%27)),sort:!(%27@timestamp%27,desc))';
      const shortUrl = await shortenUrl(`http://localhost${basePath}${relativeUrl}`, {
        basePath,
        post: postStub,
      });
      expect(shortUrl).toBe(`http://localhost${basePath}/goto/${shareId}`);
      expect(postStub).toHaveBeenCalledWith(`/api/shorten_url`, {
        body:
          '{"url":"/app/kibana#/discover?_g=(refreshInterval:(pause:!f,value:0),time:(from:now-15m,mode:quick,to:now))&_a=(columns:!(_source),index:%27logstash-*%27,interval:auto,query:(query_string:(analyze_wildcard:!t,query:%27*%27)),sort:!(%27@timestamp%27,desc))"}',
      });
    });
  });
});
