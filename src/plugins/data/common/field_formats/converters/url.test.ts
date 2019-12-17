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

import { UrlFormat } from './url';
import { TEXT_CONTENT_TYPE, HTML_CONTENT_TYPE } from '../content_types';

describe('UrlFormat', () => {
  test('outputs a simple <a> tag by default', () => {
    const url = new UrlFormat({});

    expect(url.convert('http://elastic.co', HTML_CONTENT_TYPE)).toBe(
      '<span ng-non-bindable><a href="http://elastic.co" target="_blank" rel="noopener noreferrer">http://elastic.co</a></span>'
    );
  });

  test('outputs an <audio> if type === "audio"', () => {
    const url = new UrlFormat({ type: 'audio' });

    expect(url.convert('http://elastic.co', HTML_CONTENT_TYPE)).toBe(
      '<span ng-non-bindable><audio controls preload="none" src="http://elastic.co"></span>'
    );
  });

  describe('outputs an <image> if type === "img"', () => {
    test('default', () => {
      const url = new UrlFormat({ type: 'img' });

      expect(url.convert('http://elastic.co', HTML_CONTENT_TYPE)).toBe(
        '<span ng-non-bindable><img src="http://elastic.co" alt="A dynamically-specified image located at http://elastic.co" ' +
          'style="width:auto; height:auto; max-width:none; max-height:none;"></span>'
      );
    });

    test('with correct width and height set', () => {
      const url = new UrlFormat({ type: 'img', width: '12', height: '55' });

      expect(url.convert('http://elastic.co', HTML_CONTENT_TYPE)).toBe(
        '<span ng-non-bindable><img src="http://elastic.co" alt="A dynamically-specified image located at http://elastic.co" ' +
          'style="width:auto; height:auto; max-width:12px; max-height:55px;"></span>'
      );
    });

    test('with correct width and height set if no width specified', () => {
      const url = new UrlFormat({ type: 'img', height: '55' });

      expect(url.convert('http://elastic.co', HTML_CONTENT_TYPE)).toBe(
        '<span ng-non-bindable><img src="http://elastic.co" alt="A dynamically-specified image located at http://elastic.co" ' +
          'style="width:auto; height:auto; max-width:none; max-height:55px;"></span>'
      );
    });

    test('with correct width and height set if no height specified', () => {
      const url = new UrlFormat({ type: 'img', width: '22' });

      expect(url.convert('http://elastic.co', HTML_CONTENT_TYPE)).toBe(
        '<span ng-non-bindable><img src="http://elastic.co" alt="A dynamically-specified image located at http://elastic.co" ' +
          'style="width:auto; height:auto; max-width:22px; max-height:none;"></span>'
      );
    });

    test('only accepts valid numbers for width', () => {
      const url = new UrlFormat({ type: 'img', width: 'not a number' });

      expect(url.convert('http://elastic.co', HTML_CONTENT_TYPE)).toBe(
        '<span ng-non-bindable><img src="http://elastic.co" alt="A dynamically-specified image located at http://elastic.co" ' +
          'style="width:auto; height:auto; max-width:none; max-height:none;"></span>'
      );
    });

    test('only accepts valid numbers for height', () => {
      const url = new UrlFormat({ type: 'img', height: 'not a number' });

      expect(url.convert('http://elastic.co', HTML_CONTENT_TYPE)).toBe(
        '<span ng-non-bindable><img src="http://elastic.co" alt="A dynamically-specified image located at http://elastic.co" ' +
          'style="width:auto; height:auto; max-width:none; max-height:none;"></span>'
      );
    });
  });

  describe('url template', () => {
    test('accepts a template', () => {
      const url = new UrlFormat({ urlTemplate: 'http://{{ value }}' });

      expect(url.convert('url', HTML_CONTENT_TYPE)).toBe(
        '<span ng-non-bindable><a href="http://url" target="_blank" rel="noopener noreferrer">http://url</a></span>'
      );
    });

    test('only outputs the url if the contentType === "text"', () => {
      const url = new UrlFormat({});

      expect(url.convert('url', TEXT_CONTENT_TYPE)).toBe('url');
    });
  });

  describe('label template', () => {
    test('accepts a template', () => {
      const url = new UrlFormat({
        labelTemplate: 'extension: {{ value }}',
        urlTemplate: 'http://www.{{value}}.com',
      });

      expect(url.convert('php', HTML_CONTENT_TYPE)).toBe(
        '<span ng-non-bindable><a href="http://www.php.com" target="_blank" rel="noopener noreferrer">extension: php</a></span>'
      );
    });

    test('uses the label template for text formating', () => {
      const url = new UrlFormat({ labelTemplate: 'external {{value }}' });

      expect(url.convert('url', TEXT_CONTENT_TYPE)).toBe('external url');
    });

    test('can use the raw value', () => {
      const url = new UrlFormat({
        labelTemplate: 'external {{value}}',
      });

      expect(url.convert('url?', TEXT_CONTENT_TYPE)).toBe('external url?');
    });

    test('can use the url', () => {
      const url = new UrlFormat({
        urlTemplate: 'http://google.com/{{value}}',
        labelTemplate: 'external {{url}}',
      });

      expect(url.convert('url?', TEXT_CONTENT_TYPE)).toBe('external http://google.com/url%3F');
    });
  });

  describe('templating', () => {
    test('ignores unknown variables', () => {
      const url = new UrlFormat({ urlTemplate: '{{ not really a var }}' });

      expect(url.convert('url', TEXT_CONTENT_TYPE)).toBe('');
    });

    test('does not allow executing code in variable expressions', () => {
      const url = new UrlFormat({ urlTemplate: '{{ (__dirname = true) && value }}' });

      expect(url.convert('url', TEXT_CONTENT_TYPE)).toBe('');
    });

    describe('', () => {
      test('does not get values from the prototype chain', () => {
        const url = new UrlFormat({ urlTemplate: '{{ toString }}' });

        expect(url.convert('url', TEXT_CONTENT_TYPE)).toBe('');
      });
    });
  });

  describe('whitelist', () => {
    test('should assume a relative url if the value is not in the whitelist without a base path', () => {
      const url = new UrlFormat({});
      const converter = url.getConverterFor(HTML_CONTENT_TYPE) as Function;
      const options = {
        parsedUrl: {
          origin: 'http://kibana',
          basePath: '',
        },
      };

      expect(converter('www.elastic.co', options)).toBe(
        '<span ng-non-bindable><a href="http://kibana/app/www.elastic.co" target="_blank" rel="noopener noreferrer">www.elastic.co</a></span>'
      );

      expect(converter('elastic.co', options)).toBe(
        '<span ng-non-bindable><a href="http://kibana/app/elastic.co" target="_blank" rel="noopener noreferrer">elastic.co</a></span>'
      );

      expect(converter('elastic', options)).toBe(
        '<span ng-non-bindable><a href="http://kibana/app/elastic" target="_blank" rel="noopener noreferrer">elastic</a></span>'
      );

      expect(converter('ftp://elastic.co', options)).toBe(
        '<span ng-non-bindable><a href="http://kibana/app/ftp://elastic.co" target="_blank" rel="noopener noreferrer">ftp://elastic.co</a></span>'
      );
    });

    test('should assume a relative url if the value is not in the whitelist with a basepath', () => {
      const url = new UrlFormat({});
      const converter = url.getConverterFor(HTML_CONTENT_TYPE) as Function;
      const options = {
        parsedUrl: {
          origin: 'http://kibana',
          basePath: '/xyz',
        },
      };

      expect(converter('www.elastic.co', options)).toBe(
        '<span ng-non-bindable><a href="http://kibana/xyz/app/www.elastic.co" target="_blank" rel="noopener noreferrer">www.elastic.co</a></span>'
      );

      expect(converter('elastic.co', options)).toBe(
        '<span ng-non-bindable><a href="http://kibana/xyz/app/elastic.co" target="_blank" rel="noopener noreferrer">elastic.co</a></span>'
      );

      expect(converter('elastic', options)).toBe(
        '<span ng-non-bindable><a href="http://kibana/xyz/app/elastic" target="_blank" rel="noopener noreferrer">elastic</a></span>'
      );

      expect(converter('ftp://elastic.co', options)).toBe(
        '<span ng-non-bindable><a href="http://kibana/xyz/app/ftp://elastic.co" target="_blank" rel="noopener noreferrer">ftp://elastic.co</a></span>'
      );
    });

    test('should rely on parsedUrl', () => {
      const url = new UrlFormat({});
      const converter = url.getConverterFor(HTML_CONTENT_TYPE) as Function;
      const options = {
        parsedUrl: {
          origin: 'http://kibana.host.com',
          basePath: '/abc',
        },
      };

      expect(converter('../app/kibana', options)).toBe(
        '<span ng-non-bindable><a href="http://kibana.host.com/abc/app/../app/kibana" target="_blank" rel="noopener noreferrer">../app/kibana</a></span>'
      );
    });

    test('should fail gracefully if there are no parsedUrl provided', () => {
      const url = new UrlFormat({});

      expect(url.convert('../app/kibana', HTML_CONTENT_TYPE)).toBe(
        '<span ng-non-bindable>../app/kibana</span>'
      );

      expect(url.convert('http://www.elastic.co', HTML_CONTENT_TYPE)).toBe(
        '<span ng-non-bindable><a href="http://www.elastic.co" target="_blank" rel="noopener noreferrer">http://www.elastic.co</a></span>'
      );
    });

    test('should support multiple types of relative urls', () => {
      const url = new UrlFormat({});
      const converter = url.getConverterFor(HTML_CONTENT_TYPE) as Function;
      const options = {
        parsedUrl: {
          origin: 'http://kibana.host.com',
          pathname: '/nbc/app/kibana#/discover',
          basePath: '/nbc',
        },
      };

      expect(converter('#/foo', options)).toBe(
        '<span ng-non-bindable><a href="http://kibana.host.com/nbc/app/kibana#/discover#/foo" target="_blank" rel="noopener noreferrer">#/foo</a></span>'
      );

      expect(converter('/nbc/app/kibana#/discover', options)).toBe(
        '<span ng-non-bindable><a href="http://kibana.host.com/nbc/app/kibana#/discover" target="_blank" rel="noopener noreferrer">/nbc/app/kibana#/discover</a></span>'
      );

      expect(converter('../foo/bar', options)).toBe(
        '<span ng-non-bindable><a href="http://kibana.host.com/nbc/app/../foo/bar" target="_blank" rel="noopener noreferrer">../foo/bar</a></span>'
      );
    });

    test('should support multiple types of urls w/o basePath', () => {
      const url = new UrlFormat({});
      const converter = url.getConverterFor(HTML_CONTENT_TYPE) as Function;
      const options = {
        parsedUrl: {
          origin: 'http://kibana.host.com',
          pathname: '/app/kibana',
        },
      };

      expect(converter('10.22.55.66', options)).toBe(
        '<span ng-non-bindable><a href="http://kibana.host.com/app/10.22.55.66" target="_blank" rel="noopener noreferrer">10.22.55.66</a></span>'
      );

      expect(converter('http://www.domain.name/app/kibana#/dashboard/', options)).toBe(
        '<span ng-non-bindable><a href="http://www.domain.name/app/kibana#/dashboard/" target="_blank" rel="noopener noreferrer">http://www.domain.name/app/kibana#/dashboard/</a></span>'
      );

      expect(converter('/app/kibana', options)).toBe(
        '<span ng-non-bindable><a href="http://kibana.host.com/app/kibana" target="_blank" rel="noopener noreferrer">/app/kibana</a></span>'
      );

      expect(converter('kibana#/dashboard/', options)).toBe(
        '<span ng-non-bindable><a href="http://kibana.host.com/app/kibana#/dashboard/" target="_blank" rel="noopener noreferrer">kibana#/dashboard/</a></span>'
      );

      expect(converter('#/dashboard/', options)).toBe(
        '<span ng-non-bindable><a href="http://kibana.host.com/app/kibana#/dashboard/" target="_blank" rel="noopener noreferrer">#/dashboard/</a></span>'
      );
    });
  });
});
