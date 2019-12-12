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
jest.mock('ui/kfetch', () => ({}));

jest.mock('../../chrome', () => ({}));

import sinon from 'sinon';
import expect from '@kbn/expect';
import { shortenUrl } from './url_shortener';

describe('Url shortener', () => {
  const shareId = 'id123';

  let kfetchStub;
  beforeEach(() => {
    kfetchStub = sinon.stub();
    require('ui/kfetch').kfetch = async (...args) => {
      return kfetchStub(...args);
    };
  });

  describe('Shorten without base path', () => {
    beforeAll(() => {
      require('../../chrome').getBasePath = () => {
        return '';
      };
    });

    it('should shorten urls with a port', async () => {
      kfetchStub.withArgs({
        method: 'POST',
        pathname: `/api/shorten_url`,
        body: '{"url":"/app/kibana#123"}'
      }).returns(Promise.resolve({ urlId: shareId }));

      const shortUrl = await shortenUrl('http://localhost:5601/app/kibana#123');
      expect(shortUrl).to.be(`http://localhost:5601/goto/${shareId}`);
    });

    it('should shorten urls without a port', async () => {
      kfetchStub.withArgs({
        method: 'POST',
        pathname: `/api/shorten_url`,
        body: '{"url":"/app/kibana#123"}'
      }).returns(Promise.resolve({ urlId: shareId }));

      const shortUrl = await shortenUrl('http://localhost/app/kibana#123');
      expect(shortUrl).to.be(`http://localhost/goto/${shareId}`);
    });
  });

  describe('Shorten with base path', () => {
    const basePath = '/foo';

    beforeAll(() => {
      require('../../chrome').getBasePath = () => {
        return basePath;
      };
    });

    it('should shorten urls with a port', async () => {
      kfetchStub.withArgs({
        method: 'POST',
        pathname: `/api/shorten_url`,
        body: '{"url":"/app/kibana#123"}'
      }).returns(Promise.resolve({ urlId: shareId }));

      const shortUrl = await shortenUrl(`http://localhost:5601${basePath}/app/kibana#123`);
      expect(shortUrl).to.be(`http://localhost:5601${basePath}/goto/${shareId}`);
    });

    it('should shorten urls without a port', async () => {
      kfetchStub.withArgs({
        method: 'POST',
        pathname: `/api/shorten_url`,
        body: '{"url":"/app/kibana#123"}'
      }).returns(Promise.resolve({ urlId: shareId }));

      const shortUrl = await shortenUrl(`http://localhost${basePath}/app/kibana#123`);
      expect(shortUrl).to.be(`http://localhost${basePath}/goto/${shareId}`);
    });

    it('should shorten urls with a query string', async () => {
      kfetchStub.withArgs({
        method: 'POST',
        pathname: `/api/shorten_url`,
        body: '{"url":"/app/kibana?foo#123"}'
      }).returns(Promise.resolve({ urlId: shareId }));

      const shortUrl = await shortenUrl(`http://localhost${basePath}/app/kibana?foo#123`);
      expect(shortUrl).to.be(`http://localhost${basePath}/goto/${shareId}`);
    });

    it('should shorten urls without a hash', async () => {
      kfetchStub.withArgs({
        method: 'POST',
        pathname: `/api/shorten_url`,
        body: '{"url":"/app/kibana"}'
      }).returns(Promise.resolve({ urlId: shareId }));

      const shortUrl = await shortenUrl(`http://localhost${basePath}/app/kibana`);
      expect(shortUrl).to.be(`http://localhost${basePath}/goto/${shareId}`);
    });

    it('should shorten urls with a query string in the hash', async () => {
      const relativeUrl = "/app/kibana#/discover?_g=(refreshInterval:(pause:!f,value:0),time:(from:now-15m,mode:quick,to:now))&_a=(columns:!(_source),index:%27logstash-*%27,interval:auto,query:(query_string:(analyze_wildcard:!t,query:%27*%27)),sort:!(%27@timestamp%27,desc))";
      kfetchStub.withArgs({
        method: 'POST',
        pathname: `/api/shorten_url`,
        body: '{"url":"/app/kibana#/discover?_g=(refreshInterval:(pause:!f,value:0),time:(from:now-15m,mode:quick,to:now))&_a=(columns:!(_source),index:%27logstash-*%27,interval:auto,query:(query_string:(analyze_wildcard:!t,query:%27*%27)),sort:!(%27@timestamp%27,desc))"}'
      }).returns(Promise.resolve({ urlId: shareId }));

      const shortUrl = await shortenUrl(`http://localhost${basePath}${relativeUrl}`);
      expect(shortUrl).to.be(`http://localhost${basePath}/goto/${shareId}`);
    });
  });
});
