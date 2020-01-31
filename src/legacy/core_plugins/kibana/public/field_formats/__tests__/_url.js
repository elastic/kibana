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

import $ from 'jquery';
import expect from '@kbn/expect';
import { fieldFormats } from 'ui/registry/field_formats';
describe('Url Format', function() {
  const unwrap = $el => {
    expect($el.is('span[ng-non-bindable]')).to.be.ok();
    return $el.children();
  };

  describe('Url Format', function() {
    let Url;

    beforeEach(function() {
      Url = fieldFormats.getType('url');
    });

    it('outputs a simple <a> tab by default', function() {
      const url = new Url();

      const $a = unwrap($(url.convert('http://elastic.co', 'html')));
      expect($a.is('a')).to.be(true);
      expect($a.length).to.be(1);
      expect($a.attr('href')).to.be('http://elastic.co');
      expect($a.attr('target')).to.be('_blank');
      expect($a.children().length).to.be(0);
    });

    it('outputs a <a> link with target=_self if "open link in current tab" is checked', function() {
      const url = new Url({ openLinkInCurrentTab: true });

      const $a = unwrap($(url.convert('http://elastic.co', 'html')));
      expect($a.is('a')).to.be(true);
      expect($a.attr('target')).to.be('_self');
    });

    it('outputs an <image> if type === "img"', function() {
      const url = new Url({ type: 'img' });

      const $img = unwrap($(url.convert('http://elastic.co', 'html')));
      expect($img.is('img')).to.be(true);
      expect($img.attr('src')).to.be('http://elastic.co');
    });

    describe('url template', function() {
      it('accepts a template', function() {
        const url = new Url({ urlTemplate: 'http://{{ value }}' });
        const $a = unwrap($(url.convert('url', 'html')));
        expect($a.is('a')).to.be(true);
        expect($a.length).to.be(1);
        expect($a.attr('href')).to.be('http://url');
        expect($a.attr('target')).to.be('_blank');
        expect($a.children().length).to.be(0);
      });

      it('only outputs the url if the contentType === "text"', function() {
        const url = new Url();
        expect(url.convert('url', 'text')).to.be('url');
      });
    });

    describe('label template', function() {
      it('accepts a template', function() {
        const url = new Url({
          labelTemplate: 'extension: {{ value }}',
          urlTemplate: 'http://www.{{value}}.com',
        });
        const $a = unwrap($(url.convert('php', 'html')));
        expect($a.is('a')).to.be(true);
        expect($a.length).to.be(1);
        expect($a.attr('href')).to.be('http://www.php.com');
        expect($a.html()).to.be('extension: php');
      });

      it('uses the label template for text formating', function() {
        const url = new Url({ labelTemplate: 'external {{value }}' });
        expect(url.convert('url', 'text')).to.be('external url');
      });

      it('can use the raw value', function() {
        const url = new Url({
          labelTemplate: 'external {{value}}',
        });
        expect(url.convert('url?', 'text')).to.be('external url?');
      });

      it('can use the url', function() {
        const url = new Url({
          urlTemplate: 'http://google.com/{{value}}',
          labelTemplate: 'external {{url}}',
        });
        expect(url.convert('url?', 'text')).to.be('external http://google.com/url%3F');
      });
    });

    describe('templating', function() {
      it('ignores unknown variables', function() {
        const url = new Url({ urlTemplate: '{{ not really a var }}' });
        expect(url.convert('url', 'text')).to.be('');
      });

      it('does not allow executing code in variable expressions', function() {
        window.SHOULD_NOT_BE_TRUE = false;
        const url = new Url({ urlTemplate: '{{ (window.SHOULD_NOT_BE_TRUE = true) && value }}' });
        expect(url.convert('url', 'text')).to.be('');
      });

      describe('', function() {
        it('does not get values from the prototype chain', function() {
          const url = new Url({ urlTemplate: '{{ toString }}' });
          expect(url.convert('url', 'text')).to.be('');
        });
      });
    });

    describe('whitelist', function() {
      it('should assume a relative url if the value is not in the whitelist without a base path', function() {
        const url = new Url();
        const parsedUrl = {
          origin: 'http://kibana',
          basePath: '',
        };
        const converter = url.getConverterFor('html');

        expect(converter('www.elastic.co', null, null, parsedUrl)).to.be(
          '<span ng-non-bindable><a href="http://kibana/app/www.elastic.co" target="_blank" rel="noopener noreferrer">www.elastic.co</a></span>'
        );

        expect(converter('elastic.co', null, null, parsedUrl)).to.be(
          '<span ng-non-bindable><a href="http://kibana/app/elastic.co" target="_blank" rel="noopener noreferrer">elastic.co</a></span>'
        );

        expect(converter('elastic', null, null, parsedUrl)).to.be(
          '<span ng-non-bindable><a href="http://kibana/app/elastic" target="_blank" rel="noopener noreferrer">elastic</a></span>'
        );

        expect(converter('ftp://elastic.co', null, null, parsedUrl)).to.be(
          '<span ng-non-bindable><a href="http://kibana/app/ftp://elastic.co" target="_blank" rel="noopener noreferrer">ftp://elastic.co</a></span>'
        );
      });

      it('should assume a relative url if the value is not in the whitelist with a basepath', function() {
        const url = new Url();
        const parsedUrl = {
          origin: 'http://kibana',
          basePath: '/xyz',
        };
        const converter = url.getConverterFor('html');

        expect(converter('www.elastic.co', null, null, parsedUrl)).to.be(
          '<span ng-non-bindable><a href="http://kibana/xyz/app/www.elastic.co" target="_blank" rel="noopener noreferrer">www.elastic.co</a></span>'
        );

        expect(converter('elastic.co', null, null, parsedUrl)).to.be(
          '<span ng-non-bindable><a href="http://kibana/xyz/app/elastic.co" target="_blank" rel="noopener noreferrer">elastic.co</a></span>'
        );

        expect(converter('elastic', null, null, parsedUrl)).to.be(
          '<span ng-non-bindable><a href="http://kibana/xyz/app/elastic" target="_blank" rel="noopener noreferrer">elastic</a></span>'
        );

        expect(converter('ftp://elastic.co', null, null, parsedUrl)).to.be(
          '<span ng-non-bindable><a href="http://kibana/xyz/app/ftp://elastic.co" target="_blank" rel="noopener noreferrer">ftp://elastic.co</a></span>'
        );
      });

      it('should rely on parsedUrl', function() {
        const url = new Url();
        const parsedUrl = {
          origin: 'http://kibana.host.com',
          basePath: '/abc',
        };
        const converter = url.getConverterFor('html');

        expect(converter('../app/kibana', null, null, parsedUrl)).to.be(
          '<span ng-non-bindable><a href="http://kibana.host.com/abc/app/../app/kibana" target="_blank" rel="noopener noreferrer">../app/kibana</a></span>'
        );
      });

      it('should fail gracefully if there are no parsedUrl provided', function() {
        const url = new Url();
        const parsedUrl = null;
        const converter = url.getConverterFor('html');

        expect(converter('../app/kibana', null, null, parsedUrl)).to.be(
          '<span ng-non-bindable>../app/kibana</span>'
        );

        expect(converter('http://www.elastic.co', null, null, parsedUrl)).to.be(
          '<span ng-non-bindable><a href="http://www.elastic.co" target="_blank" rel="noopener noreferrer">http://www.elastic.co</a></span>'
        );
      });

      it('should support multiple types of relative urls', function() {
        const url = new Url();
        const parsedUrl = {
          origin: 'http://kibana.host.com',
          pathname: '/nbc/app/kibana#/discover',
          basePath: '/nbc',
        };
        const converter = url.getConverterFor('html');

        expect(converter('#/foo', null, null, parsedUrl)).to.be(
          '<span ng-non-bindable><a href="http://kibana.host.com/nbc/app/kibana#/discover#/foo" target="_blank" rel="noopener noreferrer">#/foo</a></span>'
        );

        expect(converter('/nbc/app/kibana#/discover', null, null, parsedUrl)).to.be(
          '<span ng-non-bindable><a href="http://kibana.host.com/nbc/app/kibana#/discover" target="_blank" rel="noopener noreferrer">/nbc/app/kibana#/discover</a></span>'
        );

        expect(converter('../foo/bar', null, null, parsedUrl)).to.be(
          '<span ng-non-bindable><a href="http://kibana.host.com/nbc/app/../foo/bar" target="_blank" rel="noopener noreferrer">../foo/bar</a></span>'
        );
      });
    });
  });
});
