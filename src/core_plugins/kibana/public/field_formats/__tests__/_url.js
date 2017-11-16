import $ from 'jquery';
import expect from 'expect.js';
import ngMock from 'ng_mock';
import { RegistryFieldFormatsProvider } from 'ui/registry/field_formats';
describe('Url Format', function () {

  let fieldFormats;

  beforeEach(ngMock.module('kibana'));
  beforeEach(ngMock.inject(function (Private) {
    fieldFormats = Private(RegistryFieldFormatsProvider);
  }));

  const unwrap = $el => {
    expect($el.is('span[ng-non-bindable]')).to.be.ok();
    return $el.children();
  };

  describe('Url Format', function () {
    let Url;

    beforeEach(function () {
      Url = fieldFormats.getType('url');
    });

    it('outputs a simple <a> tab by default', function () {
      const url = new Url();

      const $a = unwrap($(url.convert('http://elastic.co', 'html')));
      expect($a.is('a')).to.be(true);
      expect($a.size()).to.be(1);
      expect($a.attr('href')).to.be('http://elastic.co');
      expect($a.attr('target')).to.be('_blank');
      expect($a.children().size()).to.be(0);
    });

    it('outputs a <a> link with target=_self if "open link in current tab" is checked', function () {
      const url = new Url({ openLinkInCurrentTab: true });

      const $a = unwrap($(url.convert('http://elastic.co', 'html')));
      expect($a.is('a')).to.be(true);
      expect($a.attr('target')).to.be('_self');
    });

    it('outputs an <image> if type === "img"', function () {
      const url = new Url({ type: 'img' });

      const $img = unwrap($(url.convert('http://elastic.co', 'html')));
      expect($img.is('img')).to.be(true);
      expect($img.attr('src')).to.be('http://elastic.co');
    });

    describe('url template', function () {
      it('accepts a template', function () {
        const url = new Url({ urlTemplate: 'http://{{ value }}' });
        const $a = unwrap($(url.convert('url', 'html')));
        expect($a.is('a')).to.be(true);
        expect($a.size()).to.be(1);
        expect($a.attr('href')).to.be('http://url');
        expect($a.attr('target')).to.be('_blank');
        expect($a.children().size()).to.be(0);
      });

      it('only outputs the url if the contentType === "text"', function () {
        const url = new Url();
        expect(url.convert('url', 'text')).to.be('url');
      });
    });

    describe('label template', function () {
      it('accepts a template', function () {
        const url = new Url({ labelTemplate: 'extension: {{ value }}', urlTemplate: 'http://www.{{value}}.com' });
        const $a = unwrap($(url.convert('php', 'html')));
        expect($a.is('a')).to.be(true);
        expect($a.size()).to.be(1);
        expect($a.attr('href')).to.be('http://www.php.com');
        expect($a.html()).to.be('extension: php');
      });

      it('uses the label template for text formating', function () {
        const url = new Url({ labelTemplate: 'external {{value }}' });
        expect(url.convert('url', 'text')).to.be('external url');
      });

      it('can use the raw value', function () {
        const url = new Url({
          labelTemplate: 'external {{value}}'
        });
        expect(url.convert('url?', 'text')).to.be('external url?');
      });

      it('can use the url', function () {
        const url = new Url({
          urlTemplate: 'http://google.com/{{value}}',
          labelTemplate: 'external {{url}}'
        });
        expect(url.convert('url?', 'text')).to.be('external http://google.com/url%3F');
      });
    });

    describe('templating', function () {
      it('ignores unknown variables', function () {
        const url = new Url({ urlTemplate: '{{ not really a var }}' });
        expect(url.convert('url', 'text')).to.be('');
      });

      it('does not allow executing code in variable expressions', function () {
        window.SHOULD_NOT_BE_TRUE = false;
        const url = new Url({ urlTemplate: '{{ (window.SHOULD_NOT_BE_TRUE = true) && value }}' });
        expect(url.convert('url', 'text')).to.be('');
      });

      describe('', function () {
        it('does not get values from the prototype chain', function () {
          const url = new Url({ urlTemplate: '{{ toString }}' });
          expect(url.convert('url', 'text')).to.be('');
        });
      });
    });

    describe('whitelist', function () {
      it('should assume a relative url if the value is not in the whitelist', function () {
        const url = new Url({
          currentUrlParts: {
            origin: 'http://kibana.host.com',
            basePath: '',
          },
        });

        expect(url.convert('www.elastic.co', 'html'))
          .to.be('<span ng-non-bindable><a href="http://kibana.host.com/app/www.elastic.co" target="_blank" rel="noopener noreferrer">www.elastic.co</a></span>');

        expect(url.convert('elastic.co', 'html'))
          .to.be('<span ng-non-bindable><a href="http://kibana.host.com/app/elastic.co" target="_blank" rel="noopener noreferrer">elastic.co</a></span>');

        expect(url.convert('elastic', 'html'))
          .to.be('<span ng-non-bindable><a href="http://kibana.host.com/app/elastic" target="_blank" rel="noopener noreferrer">elastic</a></span>');

        expect(url.convert('ftp://elastic.co', 'html'))
          .to.be('<span ng-non-bindable><a href="http://kibana.host.com/app/ftp://elastic.co" target="_blank" rel="noopener noreferrer">ftp://elastic.co</a></span>');
      });

      it('should rely on currentUrlParts', function () {
        const url = new Url({
          currentUrlParts: {
            origin: 'http://kibana.host.com',
            basePath: '/abc',
          },
        });

        expect(url.convert('../app/kibana', 'html'))
          .to.be('<span ng-non-bindable><a href="http://kibana.host.com/abc/app/../app/kibana" target="_blank" rel="noopener noreferrer">../app/kibana</a></span>');
      });

      it('should fail gracefully if there are no currentUrlParts provided', function () {
        const url = new Url();

        expect(url.convert('../app/kibana', 'html'))
          .to.be('<span ng-non-bindable>../app/kibana</span>');

        expect(url.convert('http://www.elastic.co', 'html'))
          .to.be('<span ng-non-bindable><a href="http://www.elastic.co" target="_blank" rel="noopener noreferrer">http://www.elastic.co</a></span>');
      });
    });
  });
});
