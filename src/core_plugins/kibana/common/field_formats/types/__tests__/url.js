import expect from 'expect.js';
import { UrlFormat } from '../url';

describe('UrlFormat', function () {

  it('ouputs a simple <a> tab by default', function () {
    const url = new UrlFormat();

    expect(url.convert('http://elastic.co', 'html'))
      .to.be('<span ng-non-bindable><a href="http://elastic.co" target="_blank">http://elastic.co</a></span>');
  });

  it('outputs an <image> if type === "img"', function () {
    const url = new UrlFormat({ type: 'img' });

    expect(url.convert('http://elastic.co', 'html'))
      .to.be('<span ng-non-bindable><img src="http://elastic.co" alt="A dynamically-specified image located at http://elastic.co"></span>');
  });

  describe('url template', function () {
    it('accepts a template', function () {
      const url = new UrlFormat({ urlTemplate: 'url: {{ value }}' });
      expect(url.convert('url', 'html'))
        .to.be('<span ng-non-bindable><a href="url: url" target="_blank">url: url</a></span>');
    });

    it('only outputs the url if the contentType === "text"', function () {
      const url = new UrlFormat();
      expect(url.convert('url', 'text')).to.be('url');
    });
  });

  describe('label template', function () {
    it('accepts a template', function () {
      const url = new UrlFormat({ labelTemplate: 'extension: {{ value }}' });
      expect(url.convert('php', 'html'))
        .to.be('<span ng-non-bindable><a href="php" target="_blank">extension: php</a></span>');
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
});
