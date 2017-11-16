import expect from 'expect.js';
import { createUrlFormat } from '../url';
import { FieldFormat } from '../../../../../../ui/field_formats/field_format';

const UrlFormat = createUrlFormat(FieldFormat);

describe('UrlFormat', function () {

  it('ouputs a simple <a> tab by default', function () {
    const url = new UrlFormat();

    expect(url.convert('http://elastic.co', 'html'))
      .to.be('<span ng-non-bindable><a href="http://elastic.co" target="_blank" rel="noopener noreferrer">http://elastic.co</a></span>');
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
    it('should assume a relative url if the value is not in the whitelist', function () {
      const url = new UrlFormat({
        currentUrlParts: {
          origin: 'http://kibana',
          basePath: '',
        },
      });

      expect(url.convert('www.elastic.co', 'html'))
        .to.be('<span ng-non-bindable><a href="http://kibana/app/www.elastic.co" target="_blank" rel="noopener noreferrer">www.elastic.co</a></span>');

      expect(url.convert('elastic.co', 'html'))
        .to.be('<span ng-non-bindable><a href="http://kibana/app/elastic.co" target="_blank" rel="noopener noreferrer">elastic.co</a></span>');

      expect(url.convert('elastic', 'html'))
        .to.be('<span ng-non-bindable><a href="http://kibana/app/elastic" target="_blank" rel="noopener noreferrer">elastic</a></span>');

      expect(url.convert('ftp://elastic.co', 'html'))
        .to.be('<span ng-non-bindable><a href="http://kibana/app/ftp://elastic.co" target="_blank" rel="noopener noreferrer">ftp://elastic.co</a></span>');
    });

    it('should rely on currentUrlParts', function () {
      const url = new UrlFormat({
        currentUrlParts: {
          origin: 'http://kibana.host.com',
          basePath: '/abc',
        },
      });

      expect(url.convert('../app/kibana', 'html'))
        .to.be('<span ng-non-bindable><a href="http://kibana.host.com/abc/app/../app/kibana" target="_blank" rel="noopener noreferrer">../app/kibana</a></span>');
    });

    it('should fail gracefully if there are no currentUrlParts provided', function () {
      const url = new UrlFormat();

      expect(url.convert('../app/kibana', 'html'))
        .to.be('<span ng-non-bindable>../app/kibana</span>');

      expect(url.convert('http://www.elastic.co', 'html'))
        .to.be('<span ng-non-bindable><a href="http://www.elastic.co" target="_blank" rel="noopener noreferrer">http://www.elastic.co</a></span>');
    });

    it('should support multiple types of relative urls', function () {
      const url = new UrlFormat({
        currentUrlParts: {
          origin: 'http://kibana.host.com',
          pathname: '/nbc/app/kibana#/discover',
          basePath: '/nbc',
        },
      });

      expect(url.convert('#/foo', 'html'))
        .to.be('<span ng-non-bindable><a href="http://kibana.host.com/nbc/app/kibana#/discover#/foo" target="_blank" rel="noopener noreferrer">#/foo</a></span>');

      expect(url.convert('../foo/bar', 'html'))
        .to.be('<span ng-non-bindable><a href="http://kibana.host.com/nbc/app/../foo/bar" target="_blank" rel="noopener noreferrer">../foo/bar</a></span>');
    });
  });
});
