/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { UrlFormat } from './url';
import { expectReactElementWithNull, expectReactElementWithBlank } from '../test_utils';

describe('UrlFormat', () => {
  test('outputs a simple <a> tag by default', () => {
    const url = new UrlFormat({});

    expect(url.convertToText('http://elastic.co')).toBe('http://elastic.co');
    expect(url.convertToReact('http://elastic.co')).toMatchInlineSnapshot(`
      <a
        href="http://elastic.co"
        rel="noopener noreferrer"
        target="_blank"
      >
        http://elastic.co
      </a>
    `);
  });

  test('outputs a mailto: link when URL starts with mailto:', () => {
    const url = new UrlFormat({});

    expect(url.convertToText('mailto:test@example.com')).toBe(
      'mailto:test@example.com'
    );
    expect(url.convertToReact('mailto:test@example.com')).toMatchInlineSnapshot(`
      <a
        href="mailto:test@example.com"
        rel="noopener noreferrer"
        target="_blank"
      >
        mailto:test@example.com
      </a>
    `);
  });

  test('handles missing values', () => {
    const url = new UrlFormat({});

    expect(url.convertToText(null)).toBe('(null)');
    expect(url.convertToText(undefined)).toBe('(null)');
    expect(url.convertToText('')).toBe('(blank)');
    expectReactElementWithNull(url.convertToReact(null));
    expectReactElementWithNull(url.convertToReact(undefined));
    expectReactElementWithBlank(url.convertToReact(''));
  });

  test('outputs an <audio> if type === "audio"', () => {
    const url = new UrlFormat({ type: 'audio' });

    expect(url.convertToText('http://elastic.co')).toBe('http://elastic.co');
    expect(url.convertToReact('http://elastic.co')).toMatchInlineSnapshot(`
      <audio
        controls={true}
        preload="none"
        src="http://elastic.co"
      />
    `);
  });

  describe('outputs an <image> if type === "img"', () => {
    test('default', () => {
      const url = new UrlFormat({ type: 'img' });

      expect(url.convertToText('http://elastic.co')).toBe('http://elastic.co');
      expect(url.convertToReact('http://elastic.co')).toMatchInlineSnapshot(`
        <img
          alt="A dynamically-specified image located at http://elastic.co"
          src="http://elastic.co"
          style={
            Object {
              "height": "auto",
              "maxHeight": "none",
              "maxWidth": "none",
              "width": "auto",
            }
          }
        />
      `);
    });

    test('with correct width and height set', () => {
      const url = new UrlFormat({ type: 'img', width: '12', height: '55' });

      expect(url.convertToText('http://elastic.co')).toBe('http://elastic.co');
      expect(url.convertToReact('http://elastic.co')).toMatchInlineSnapshot(`
        <img
          alt="A dynamically-specified image located at http://elastic.co"
          src="http://elastic.co"
          style={
            Object {
              "height": "auto",
              "maxHeight": "55px",
              "maxWidth": "12px",
              "width": "auto",
            }
          }
        />
      `);
    });

    test('with correct width and height set if no width specified', () => {
      const url = new UrlFormat({ type: 'img', height: '55' });

      expect(url.convertToText('http://elastic.co')).toBe('http://elastic.co');
      expect(url.convertToReact('http://elastic.co')).toMatchInlineSnapshot(`
        <img
          alt="A dynamically-specified image located at http://elastic.co"
          src="http://elastic.co"
          style={
            Object {
              "height": "auto",
              "maxHeight": "55px",
              "maxWidth": "none",
              "width": "auto",
            }
          }
        />
      `);
    });

    test('with correct width and height set if no height specified', () => {
      const url = new UrlFormat({ type: 'img', width: '22' });

      expect(url.convertToText('http://elastic.co')).toBe('http://elastic.co');
      expect(url.convertToReact('http://elastic.co')).toMatchInlineSnapshot(`
        <img
          alt="A dynamically-specified image located at http://elastic.co"
          src="http://elastic.co"
          style={
            Object {
              "height": "auto",
              "maxHeight": "none",
              "maxWidth": "22px",
              "width": "auto",
            }
          }
        />
      `);
    });

    test('only accepts valid numbers for width', () => {
      const url = new UrlFormat({ type: 'img', width: 'not a number' });

      expect(url.convertToText('http://elastic.co')).toBe('http://elastic.co');
      expect(url.convertToReact('http://elastic.co')).toMatchInlineSnapshot(`
        <img
          alt="A dynamically-specified image located at http://elastic.co"
          src="http://elastic.co"
          style={
            Object {
              "height": "auto",
              "maxHeight": "none",
              "maxWidth": "none",
              "width": "auto",
            }
          }
        />
      `);

      const url2 = new UrlFormat({ type: 'img', width: '123not a number' });

      expect(url2.convertToText('http://elastic.co')).toBe('http://elastic.co');
      expect(url2.convertToReact('http://elastic.co')).toMatchInlineSnapshot(`
        <img
          alt="A dynamically-specified image located at http://elastic.co"
          src="http://elastic.co"
          style={
            Object {
              "height": "auto",
              "maxHeight": "none",
              "maxWidth": "123px",
              "width": "auto",
            }
          }
        />
      `);
    });

    test('only accepts valid numbers for height', () => {
      const url = new UrlFormat({ type: 'img', height: 'not a number' });

      expect(url.convertToText('http://elastic.co')).toBe('http://elastic.co');
      expect(url.convertToReact('http://elastic.co')).toMatchInlineSnapshot(`
        <img
          alt="A dynamically-specified image located at http://elastic.co"
          src="http://elastic.co"
          style={
            Object {
              "height": "auto",
              "maxHeight": "none",
              "maxWidth": "none",
              "width": "auto",
            }
          }
        />
      `);

      const url2 = new UrlFormat({ type: 'img', height: '123not a number' });

      expect(url2.convertToText('http://elastic.co')).toBe('http://elastic.co');
      expect(url2.convertToReact('http://elastic.co')).toMatchInlineSnapshot(`
        <img
          alt="A dynamically-specified image located at http://elastic.co"
          src="http://elastic.co"
          style={
            Object {
              "height": "auto",
              "maxHeight": "123px",
              "maxWidth": "none",
              "width": "auto",
            }
          }
        />
      `);
    });
  });

  describe('url template', () => {
    test('accepts a template', () => {
      const url = new UrlFormat({ urlTemplate: 'http://{{ value }}' });

      expect(url.convertToText('url')).toBe('http://url');
      expect(url.convertToReact('url')).toMatchInlineSnapshot(`
        <a
          href="http://url"
          rel="noopener noreferrer"
          target="_blank"
        >
          http://url
        </a>
      `);
    });

    test('only outputs the url if the contentType === "text"', () => {
      const url = new UrlFormat({});

      expect(url.convertToText('url')).toBe('url');
      expect(url.convertToReact('url')).toBe('url');
    });

    test('rawValue in url template is not URL-encoded (unlike value)', () => {
      const url = new UrlFormat({
        urlTemplate: 'http://elastic.co/?raw={{rawValue}}&encoded={{value}}',
      });

      expect(url.convertToText('hello world')).toBe(
        'http://elastic.co/?raw=hello world&encoded=hello%20world'
      );
      expect(url.convertToReact('hello world')).toMatchInlineSnapshot(`
        <a
          href="http://elastic.co/?raw=hello world&encoded=hello%20world"
          rel="noopener noreferrer"
          target="_blank"
        >
          http://elastic.co/?raw=hello world&encoded=hello%20world
        </a>
      `);
    });

    test('preserves the original numeric value with {{rawValue}} in url template', () => {
      const url = new UrlFormat({ urlTemplate: 'http://elastic.co/?id={{rawValue}}' });

      expect(url.convertToText(42)).toBe('http://elastic.co/?id=42');
      expect(url.convertToReact(42)).toMatchInlineSnapshot(`
        <a
          href="http://elastic.co/?id=42"
          rel="noopener noreferrer"
          target="_blank"
        >
          http://elastic.co/?id=42
        </a>
      `);
    });
  });

  describe('label template', () => {
    test('accepts a template', () => {
      const url = new UrlFormat({
        labelTemplate: 'extension: {{ value }}',
        urlTemplate: 'http://www.{{value}}.com',
      });

      expect(url.convertToText('php')).toBe('extension: php');
      expect(url.convertToReact('php')).toMatchInlineSnapshot(`
        <a
          href="http://www.php.com"
          rel="noopener noreferrer"
          target="_blank"
        >
          extension: php
        </a>
      `);
    });

    test('uses the label template for text formatting', () => {
      const url = new UrlFormat({ labelTemplate: 'external {{value }}' });

      expect(url.convertToText('url')).toBe('external url');
    });

    test('can use the raw value with {{value}}', () => {
      const url = new UrlFormat({
        labelTemplate: 'external {{value}}',
      });

      expect(url.convertToText('url?')).toBe('external url?');
    });

    test('can use the raw value with {{rawValue}}', () => {
      const url = new UrlFormat({
        labelTemplate: 'external {{rawValue}}',
      });

      expect(url.convertToText('url?')).toBe('external url?');
    });

    test('can use the url', () => {
      const url = new UrlFormat({
        urlTemplate: 'http://google.com/{{value}}',
        labelTemplate: 'external {{url}}',
      });

      expect(url.convertToText('url?')).toBe('external http://google.com/url%3F');
      expect(url.convertToReact('url?')).toMatchInlineSnapshot(`
        <a
          href="http://google.com/url%3F"
          rel="noopener noreferrer"
          target="_blank"
        >
          external http://google.com/url%3F
        </a>
      `);
    });
  });

  describe('templating', () => {
    test('ignores unknown variables', () => {
      const url = new UrlFormat({ urlTemplate: '{{ not really a var }}' });

      expect(url.convertToText('url')).toBe('');
      expect(url.convertToReact('url')).toBe('');
    });

    test('does not allow executing code in variable expressions', () => {
      const url = new UrlFormat({ urlTemplate: '{{ (__dirname = true) && value }}' });

      expect(url.convertToText('url')).toBe('');
      expect(url.convertToReact('url')).toBe('');
    });

    describe('', () => {
      test('does not get values from the prototype chain', () => {
        const url = new UrlFormat({ urlTemplate: '{{ toString }}' });

        expect(url.convertToText('url')).toBe('');
        expect(url.convertToReact('url')).toBe('');
      });
    });
  });

  describe('allow-list', () => {
    test('should assume a relative url if the value is not in the allow-list without a base path', () => {
      const parsedUrl = {
        origin: 'http://kibana',
        basePath: '',
      };
      const url = new UrlFormat({ parsedUrl });

      expect(url.convertToText('www.elastic.co')).toBe('www.elastic.co');
      expect(url.convertToReact('www.elastic.co')).toMatchInlineSnapshot(`
        <a
          href="http://kibana/app/www.elastic.co"
          rel="noopener noreferrer"
          target="_blank"
        >
          www.elastic.co
        </a>
      `);

      expect(url.convertToText('elastic.co')).toBe('elastic.co');
      expect(url.convertToReact('elastic.co')).toMatchInlineSnapshot(`
        <a
          href="http://kibana/app/elastic.co"
          rel="noopener noreferrer"
          target="_blank"
        >
          elastic.co
        </a>
      `);

      expect(url.convertToText('elastic')).toBe('elastic');
      expect(url.convertToReact('elastic')).toMatchInlineSnapshot(`
        <a
          href="http://kibana/app/elastic"
          rel="noopener noreferrer"
          target="_blank"
        >
          elastic
        </a>
      `);

      expect(url.convertToText('ftp://elastic.co')).toBe('ftp://elastic.co');
      expect(url.convertToReact('ftp://elastic.co')).toMatchInlineSnapshot(`
        <a
          href="http://kibana/app/ftp://elastic.co"
          rel="noopener noreferrer"
          target="_blank"
        >
          ftp://elastic.co
        </a>
      `);
    });

    test('should assume a relative url if the value is not in the allow-list with a basepath', () => {
      const parsedUrl = {
        origin: 'http://kibana',
        basePath: '/xyz',
      };
      const url = new UrlFormat({ parsedUrl });

      expect(url.convertToText('www.elastic.co')).toBe('www.elastic.co');
      expect(url.convertToReact('www.elastic.co')).toMatchInlineSnapshot(`
        <a
          href="http://kibana/xyz/app/www.elastic.co"
          rel="noopener noreferrer"
          target="_blank"
        >
          www.elastic.co
        </a>
      `);

      expect(url.convertToText('elastic.co')).toBe('elastic.co');
      expect(url.convertToReact('elastic.co')).toMatchInlineSnapshot(`
        <a
          href="http://kibana/xyz/app/elastic.co"
          rel="noopener noreferrer"
          target="_blank"
        >
          elastic.co
        </a>
      `);

      expect(url.convertToText('elastic')).toBe('elastic');
      expect(url.convertToReact('elastic')).toMatchInlineSnapshot(`
        <a
          href="http://kibana/xyz/app/elastic"
          rel="noopener noreferrer"
          target="_blank"
        >
          elastic
        </a>
      `);

      expect(url.convertToText('ftp://elastic.co')).toBe('ftp://elastic.co');
      expect(url.convertToReact('ftp://elastic.co')).toMatchInlineSnapshot(`
        <a
          href="http://kibana/xyz/app/ftp://elastic.co"
          rel="noopener noreferrer"
          target="_blank"
        >
          ftp://elastic.co
        </a>
      `);
    });

    test('should rely on parsedUrl', () => {
      const parsedUrl = {
        origin: 'http://kibana.host.com',
        basePath: '/abc',
      };
      const url = new UrlFormat({ parsedUrl });

      expect(url.convertToText('../app/kibana')).toBe('../app/kibana');
      expect(url.convertToReact('../app/kibana')).toMatchInlineSnapshot(`
        <a
          href="http://kibana.host.com/abc/app/../app/kibana"
          rel="noopener noreferrer"
          target="_blank"
        >
          ../app/kibana
        </a>
      `);
    });

    test('should fail gracefully if there are no parsedUrl provided', () => {
      const url = new UrlFormat({});

      expect(url.convertToText('../app/kibana')).toBe('../app/kibana');
      expect(url.convertToReact('../app/kibana')).toBe('../app/kibana');

      expect(url.convertToText('http://www.elastic.co')).toBe('http://www.elastic.co');
      expect(url.convertToReact('http://www.elastic.co')).toMatchInlineSnapshot(`
        <a
          href="http://www.elastic.co"
          rel="noopener noreferrer"
          target="_blank"
        >
          http://www.elastic.co
        </a>
      `);
    });

    test('should support multiple types of relative urls', () => {
      const parsedUrl = {
        origin: 'http://kibana.host.com',
        pathname: '/nbc/app/discover#/',
        basePath: '/nbc',
      };
      const url = new UrlFormat({ parsedUrl });

      expect(url.convertToText('#/foo')).toBe('#/foo');
      expect(url.convertToReact('#/foo')).toMatchInlineSnapshot(`
        <a
          href="http://kibana.host.com/nbc/app/discover#/#/foo"
          rel="noopener noreferrer"
          target="_blank"
        >
          #/foo
        </a>
      `);

      expect(url.convertToText('/nbc/app/discover#/')).toBe('/nbc/app/discover#/');
      expect(url.convertToReact('/nbc/app/discover#/')).toMatchInlineSnapshot(`
        <a
          href="http://kibana.host.com/nbc/app/discover#/"
          rel="noopener noreferrer"
          target="_blank"
        >
          /nbc/app/discover#/
        </a>
      `);

      expect(url.convertToText('../foo/bar')).toBe('../foo/bar');
      expect(url.convertToReact('../foo/bar')).toMatchInlineSnapshot(`
        <a
          href="http://kibana.host.com/nbc/app/../foo/bar"
          rel="noopener noreferrer"
          target="_blank"
        >
          ../foo/bar
        </a>
      `);
    });

    test('should support multiple types of urls w/o basePath', () => {
      const parsedUrl = {
        origin: 'http://kibana.host.com',
        pathname: '/app/kibana',
      };
      const url = new UrlFormat({ parsedUrl });

      expect(url.convertToText('10.22.55.66')).toBe('10.22.55.66');
      expect(url.convertToReact('10.22.55.66')).toMatchInlineSnapshot(`
        <a
          href="http://kibana.host.com/app/10.22.55.66"
          rel="noopener noreferrer"
          target="_blank"
        >
          10.22.55.66
        </a>
      `);

      expect(url.convertToText('http://www.domain.name/app/kibana#/dashboard/')).toBe(
        'http://www.domain.name/app/kibana#/dashboard/'
      );
      expect(url.convertToReact('http://www.domain.name/app/kibana#/dashboard/'))
        .toMatchInlineSnapshot(`
        <a
          href="http://www.domain.name/app/kibana#/dashboard/"
          rel="noopener noreferrer"
          target="_blank"
        >
          http://www.domain.name/app/kibana#/dashboard/
        </a>
      `);

      expect(url.convertToText('/app/kibana')).toBe('/app/kibana');
      expect(url.convertToReact('/app/kibana')).toMatchInlineSnapshot(`
        <a
          href="http://kibana.host.com/app/kibana"
          rel="noopener noreferrer"
          target="_blank"
        >
          /app/kibana
        </a>
      `);

      expect(url.convertToText('kibana#/dashboard/')).toBe('kibana#/dashboard/');
      expect(url.convertToReact('kibana#/dashboard/')).toMatchInlineSnapshot(`
        <a
          href="http://kibana.host.com/app/kibana#/dashboard/"
          rel="noopener noreferrer"
          target="_blank"
        >
          kibana#/dashboard/
        </a>
      `);

      expect(url.convertToText('#/dashboard/')).toBe('#/dashboard/');
      expect(url.convertToReact('#/dashboard/')).toMatchInlineSnapshot(`
        <a
          href="http://kibana.host.com/app/kibana#/dashboard/"
          rel="noopener noreferrer"
          target="_blank"
        >
          #/dashboard/
        </a>
      `);
    });

    test('escapes HTML in URL templates', () => {
      const url = new UrlFormat({
        type: 'a',
        urlTemplate: 'http://example.com/{{value}}',
        labelTemplate: 'Link: {{value}}',
      });
      expect(url.convertToReact('<script>alert("test")</script>')).toMatchInlineSnapshot(`
        <a
          href="http://example.com/%3Cscript%3Ealert(%22test%22)%3C%2Fscript%3E"
          rel="noopener noreferrer"
          target="_blank"
        >
          Link: &lt;script&gt;alert("test")&lt;/script&gt;
        </a>
      `);
    });
  });

  test('wraps highlighted link text in <mark>', () => {
    const url = new UrlFormat({});
    expect(
      url.convertToReact('http://elastic.co', {
        field: { name: 'link' },
        hit: {
          highlight: {
            link: ['@kibana-highlighted-field@http://elastic.co@/kibana-highlighted-field@'],
          },
        },
      })
    ).toMatchInlineSnapshot(`
      <a
        href="http://elastic.co"
        rel="noopener noreferrer"
        target="_blank"
      >
        <mark
          className="ffSearch__highlight"
        >
          http://elastic.co
        </mark>
      </a>
    `);
  });

  test('renders a numeric value as text when no URL template is set', () => {
    const url = new UrlFormat({});

    expect(url.convertToText(1234)).toBe('1234');
    expect(url.convertToReact(1234)).toBe('1234');
  });

  test('renders a numeric value as a link when a URL template is set', () => {
    const url = new UrlFormat({ urlTemplate: 'https://elastic.co/?value={{value}}' });

    expect(url.convertToText(1234)).toBe('https://elastic.co/?value=1234');
    expect(url.convertToReact(1234)).toMatchInlineSnapshot(`
      <a
        href="https://elastic.co/?value=1234"
        rel="noopener noreferrer"
        target="_blank"
      >
        https://elastic.co/?value=1234
      </a>
    `);
  });

  test('wraps a multi-value array with bracket notation', () => {
    const url = new UrlFormat({});

    expect(url.convertToText(['http://elastic.co', 'http://kibana.io'])).toBe(
      '["http://elastic.co","http://kibana.io"]'
    );
    expect(url.convertToReact(['http://elastic.co', 'http://kibana.io'])).toMatchInlineSnapshot(`
      <React.Fragment>
        <span
          className="ffArray__highlight"
        >
          [
        </span>
        <a
          href="http://elastic.co"
          rel="noopener noreferrer"
          target="_blank"
        >
          http://elastic.co
        </a>
        <span
          className="ffArray__highlight"
        >
          ,
        </span>

        <a
          href="http://kibana.io"
          rel="noopener noreferrer"
          target="_blank"
        >
          http://kibana.io
        </a>
        <span
          className="ffArray__highlight"
        >
          ]
        </span>
      </React.Fragment>
    `);
  });

  test('returns the single element without brackets for a one-element array', () => {
    const url = new UrlFormat({});

    expect(url.convertToText(['http://elastic.co'])).toBe('["http://elastic.co"]');
    expect(url.convertToReact(['http://elastic.co'])).toMatchInlineSnapshot(`
      <a
        href="http://elastic.co"
        rel="noopener noreferrer"
        target="_blank"
      >
        http://elastic.co
      </a>
    `);
  });
});
