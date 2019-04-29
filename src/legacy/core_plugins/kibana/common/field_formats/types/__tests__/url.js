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

import expect from '@kbn/expect';
import { createUrlFormat } from '../url';
import { FieldFormat } from '../../../../../../ui/field_formats/field_format';

const UrlFormat = createUrlFormat(FieldFormat);

describe('UrlFormat', function () {

  it('outputs a simple <a> tab by default', function () {
    const url = new UrlFormat();

    expect(url.convert('http://elastic.co', 'html'))
      .to.be('<span ng-non-bindable><a href="http://elastic.co" target="_blank" rel="noopener noreferrer">http://elastic.co</a></span>');
  });

  it('outputs an <audio> if type === "audio"', function () {
    const url = new UrlFormat({ type: 'audio' });

    expect(url.convert('http://elastic.co', 'html'))
      .to.be('<span ng-non-bindable><audio controls preload="none" src="http://elastic.co"></span>');
  });

  it('outputs an <image> if type === "img"', function () {
    const url = new UrlFormat({ type: 'img' });

    expect(url.convert('http://elastic.co', 'html'))
      .to.be('<span ng-non-bindable><img src="http://elastic.co" alt="A dynamically-specified image located at http://elastic.co"></span>');
  });

  describe('url template', function () {
    it('accepts a template', function () {
      const url = new UrlFormat({ urlTemplate: 'http://{{ value }}' });
      expect(url.convert('url', 'html'))
        .to.be('<span ng-non-bindable><a href="http://url" target="_blank" rel="noopener noreferrer">http://url</a></span>');
    });

    it('only outputs the url if the contentType === "text"', function () {
      const url = new UrlFormat();
      expect(url.convert('url', 'text')).to.be('url');
    });
  });

  describe('label template', function () {
    it('accepts a template', function () {
      const url = new UrlFormat({ labelTemplate: 'extension: {{ value }}', urlTemplate: 'http://www.{{value}}.com' });
      expect(url.convert('php', 'html'))
        .to.be('<span ng-non-bindable><a href="http://www.php.com" target="_blank" rel="noopener noreferrer">extension: php</a></span>');
    });

    it('uses the label template for text formating', function () {
      const url = new UrlFormat({ labelTemplate: 'external {{value }}' });
      expect(url.convert('url', 'text')).to.be('external url');
    });

    it('can use the raw value', function () {
      const url = new UrlFormat({
        labelTemplate: 'external {{value}}'
      });
      expect(url.convert('url?', 'text')).to.be('external url?');
    });

    it('can use the url', function () {
      const url = new UrlFormat({
        urlTemplate: 'http://google.com/{{value}}',
        labelTemplate: 'external {{url}}'
      });
      expect(url.convert('url?', 'text')).to.be('external http://google.com/url%3F');
    });
  });

  describe('templating', function () {
    it('ignores unknown variables', function () {
      const url = new UrlFormat({ urlTemplate: '{{ not really a var }}' });
      expect(url.convert('url', 'text')).to.be('');
    });

    it('does not allow executing code in variable expressions', function () {
      const url = new UrlFormat({ urlTemplate: '{{ (__dirname = true) && value }}' });
      expect(url.convert('url', 'text')).to.be('');
    });

    describe('', function () {
      it('does not get values from the prototype chain', function () {
        const url = new UrlFormat({ urlTemplate: '{{ toString }}' });
        expect(url.convert('url', 'text')).to.be('');
      });
    });
  });

  describe('whitelist', function () {
    it('should assume a relative url if the value is not in the whitelist without a base path', function () {
      const url = new UrlFormat();
      const parsedUrl = {
        origin: 'http://kibana',
        basePath: '',
      };
      const converter = url.getConverterFor('html');

      expect(converter('www.elastic.co', null, null, parsedUrl))
        .to.be('<span ng-non-bindable><a href="http://kibana/app/www.elastic.co" target="_blank" rel="noopener noreferrer">www.elastic.co</a></span>');

      expect(converter('elastic.co', null, null, parsedUrl))
        .to.be('<span ng-non-bindable><a href="http://kibana/app/elastic.co" target="_blank" rel="noopener noreferrer">elastic.co</a></span>');

      expect(converter('elastic', null, null, parsedUrl))
        .to.be('<span ng-non-bindable><a href="http://kibana/app/elastic" target="_blank" rel="noopener noreferrer">elastic</a></span>');

      expect(converter('ftp://elastic.co', null, null, parsedUrl))
        .to.be('<span ng-non-bindable><a href="http://kibana/app/ftp://elastic.co" target="_blank" rel="noopener noreferrer">ftp://elastic.co</a></span>');
    });

    it('should assume a relative url if the value is not in the whitelist with a basepath', function () {
      const url = new UrlFormat();
      const parsedUrl = {
        origin: 'http://kibana',
        basePath: '/xyz',
      };
      const converter = url.getConverterFor('html');

      expect(converter('www.elastic.co', null, null, parsedUrl))
        .to.be('<span ng-non-bindable><a href="http://kibana/xyz/app/www.elastic.co" target="_blank" rel="noopener noreferrer">www.elastic.co</a></span>');

      expect(converter('elastic.co', null, null, parsedUrl))
        .to.be('<span ng-non-bindable><a href="http://kibana/xyz/app/elastic.co" target="_blank" rel="noopener noreferrer">elastic.co</a></span>');

      expect(converter('elastic', null, null, parsedUrl))
        .to.be('<span ng-non-bindable><a href="http://kibana/xyz/app/elastic" target="_blank" rel="noopener noreferrer">elastic</a></span>');

      expect(converter('ftp://elastic.co', null, null, parsedUrl))
        .to.be('<span ng-non-bindable><a href="http://kibana/xyz/app/ftp://elastic.co" target="_blank" rel="noopener noreferrer">ftp://elastic.co</a></span>');
    });

    it('should rely on parsedUrl', function () {
      const url = new UrlFormat();
      const parsedUrl = {
        origin: 'http://kibana.host.com',
        basePath: '/abc',
      };
      const converter = url.getConverterFor('html');

      expect(converter('../app/kibana', null, null, parsedUrl))
        .to.be('<span ng-non-bindable><a href="http://kibana.host.com/abc/app/../app/kibana" target="_blank" rel="noopener noreferrer">../app/kibana</a></span>');
    });

    it('should fail gracefully if there are no parsedUrl provided', function () {
      const url = new UrlFormat();

      expect(url.convert('../app/kibana', 'html'))
        .to.be('<span ng-non-bindable>../app/kibana</span>');

      expect(url.convert('http://www.elastic.co', 'html'))
        .to.be('<span ng-non-bindable><a href="http://www.elastic.co" target="_blank" rel="noopener noreferrer">http://www.elastic.co</a></span>');
    });

    it('should support multiple types of relative urls', function () {
      const url = new UrlFormat();
      const parsedUrl = {
        origin: 'http://kibana.host.com',
        pathname: '/nbc/app/kibana#/discover',
        basePath: '/nbc',
      };
      const converter = url.getConverterFor('html');

      expect(converter('#/foo', null, null, parsedUrl))
        .to.be('<span ng-non-bindable><a href="http://kibana.host.com/nbc/app/kibana#/discover#/foo" target="_blank" rel="noopener noreferrer">#/foo</a></span>');

      expect(converter('/nbc/app/kibana#/discover', null, null, parsedUrl))
        .to.be('<span ng-non-bindable><a href="http://kibana.host.com/nbc/app/kibana#/discover" target="_blank" rel="noopener noreferrer">/nbc/app/kibana#/discover</a></span>');

      expect(converter('../foo/bar', null, null, parsedUrl))
        .to.be('<span ng-non-bindable><a href="http://kibana.host.com/nbc/app/../foo/bar" target="_blank" rel="noopener noreferrer">../foo/bar</a></span>');
    });
  });
});
