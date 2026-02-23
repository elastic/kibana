/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render } from '@testing-library/react';
import { UrlFormat } from './url';
import { TEXT_CONTEXT_TYPE } from '../content_types';

describe('UrlFormat', () => {
  describe('React rendering', () => {
    test('outputs a simple link by default', () => {
      const url = new UrlFormat({});
      const result = url.convertToReact('http://elastic.co');
      const { container } = render(<>{result}</>);

      const link = container.querySelector('a');
      expect(link).not.toBeNull();
      expect(link?.getAttribute('href')).toBe('http://elastic.co');
      expect(link?.getAttribute('target')).toBe('_blank');
      expect(link?.getAttribute('rel')).toBe('noopener noreferrer');
      expect(link?.textContent).toBe('http://elastic.co');
    });

    test('handles numeric values by converting to string', () => {
      const url = new UrlFormat({});
      const result = url.convertToReact(0);
      const { container } = render(<>{result}</>);

      expect(container.textContent).toBe('0');
    });

    test('handles numeric values with url template', () => {
      const url = new UrlFormat({ urlTemplate: 'http://example.com/{{value}}' });
      const result = url.convertToReact(123);
      const { container } = render(<>{result}</>);

      const link = container.querySelector('a');
      expect(link?.getAttribute('href')).toBe('http://example.com/123');
      expect(link?.textContent).toBe('http://example.com/123');
    });

    test('outputs a mailto: link when URL starts with mailto:', () => {
      const url = new UrlFormat({});
      const result = url.convertToReact('mailto:test@example.com');
      const { container } = render(<>{result}</>);

      const link = container.querySelector('a');
      expect(link?.getAttribute('href')).toBe('mailto:test@example.com');
    });

    test('outputs an audio element if type === "audio"', () => {
      const url = new UrlFormat({ type: 'audio' });
      const result = url.convertToReact('http://elastic.co');
      const { container } = render(<>{result}</>);

      const audio = container.querySelector('audio');
      expect(audio).not.toBeNull();
      expect(audio?.getAttribute('src')).toBe('http://elastic.co');
      expect(audio?.getAttribute('controls')).toBe('');
      expect(audio?.getAttribute('preload')).toBe('none');
    });

    describe('outputs an image if type === "img"', () => {
      test('default', () => {
        const url = new UrlFormat({ type: 'img' });
        const result = url.convertToReact('http://elastic.co');
        const { container } = render(<>{result}</>);

        const img = container.querySelector('img');
        expect(img).not.toBeNull();
        expect(img?.getAttribute('src')).toBe('http://elastic.co');
        expect(img?.getAttribute('alt')).toBe(
          'A dynamically-specified image located at http://elastic.co'
        );
      });

      test('with correct width and height set', () => {
        const url = new UrlFormat({ type: 'img', width: '12', height: '55' });
        const result = url.convertToReact('http://elastic.co');
        const { container } = render(<>{result}</>);

        const img = container.querySelector('img');
        expect(img).toHaveStyle({ maxWidth: '12px', maxHeight: '55px' });
      });
    });
  });

  describe('handles missing values', () => {
    test('text context', () => {
      const url = new UrlFormat({});

      expect(url.convert(null, TEXT_CONTEXT_TYPE)).toBe('(null)');
      expect(url.convert(undefined, TEXT_CONTEXT_TYPE)).toBe('(null)');
      expect(url.convert('', TEXT_CONTEXT_TYPE)).toBe('(blank)');
    });
  });

  describe('handles numeric values', () => {
    test('text context converts number to string', () => {
      const url = new UrlFormat({});

      expect(url.convert(0, TEXT_CONTEXT_TYPE)).toBe('0');
      expect(url.convert(123, TEXT_CONTEXT_TYPE)).toBe('123');
      expect(url.convert(-456, TEXT_CONTEXT_TYPE)).toBe('-456');
    });
  });

  describe('url template', () => {
    test('accepts a template', () => {
      const url = new UrlFormat({ urlTemplate: 'http://{{ value }}' });
      const result = url.convertToReact('url');
      const { container } = render(<>{result}</>);

      const link = container.querySelector('a');
      expect(link?.getAttribute('href')).toBe('http://url');
    });

    test('only outputs the url if the contentType === "text"', () => {
      const url = new UrlFormat({});

      expect(url.convert('url', TEXT_CONTEXT_TYPE)).toBe('url');
    });
  });

  describe('label template', () => {
    test('accepts a template', () => {
      const url = new UrlFormat({
        labelTemplate: 'extension: {{ value }}',
        urlTemplate: 'http://www.{{value}}.com',
      });
      const result = url.convertToReact('php');
      const { container } = render(<>{result}</>);

      const link = container.querySelector('a');
      expect(link?.getAttribute('href')).toBe('http://www.php.com');
      expect(link?.textContent).toBe('extension: php');
    });

    test('uses the label template for text formating', () => {
      const url = new UrlFormat({ labelTemplate: 'external {{value }}' });

      expect(url.convert('url', TEXT_CONTEXT_TYPE)).toBe('external url');
    });

    test('can use the raw value with {{value}}', () => {
      const url = new UrlFormat({
        labelTemplate: 'external {{value}}',
      });

      expect(url.convert('url?', TEXT_CONTEXT_TYPE)).toBe('external url?');
    });

    test('can use the raw value with {{rawValue}}', () => {
      const url = new UrlFormat({
        labelTemplate: 'external {{rawValue}}',
      });

      expect(url.convert('url?', TEXT_CONTEXT_TYPE)).toBe('external url?');
    });

    test('can use the url', () => {
      const url = new UrlFormat({
        urlTemplate: 'http://google.com/{{value}}',
        labelTemplate: 'external {{url}}',
      });

      expect(url.convert('url?', TEXT_CONTEXT_TYPE)).toBe('external http://google.com/url%3F');
    });
  });

  describe('templating', () => {
    test('ignores unknown variables', () => {
      const url = new UrlFormat({ urlTemplate: '{{ not really a var }}' });

      expect(url.convert('url', TEXT_CONTEXT_TYPE)).toBe('');
    });

    test('does not allow executing code in variable expressions', () => {
      const url = new UrlFormat({ urlTemplate: '{{ (__dirname = true) && value }}' });

      expect(url.convert('url', TEXT_CONTEXT_TYPE)).toBe('');
    });

    test('does not get values from the prototype chain', () => {
      const url = new UrlFormat({ urlTemplate: '{{ toString }}' });

      expect(url.convert('url', TEXT_CONTEXT_TYPE)).toBe('');
    });
  });

  describe('allow-list with React rendering', () => {
    test('should assume a relative url if the value is not in the allow-list without a base path', () => {
      const parsedUrl = {
        origin: 'http://kibana',
        basePath: '',
      };
      const url = new UrlFormat({ parsedUrl });

      const result = url.convertToReact('www.elastic.co');
      const { container } = render(<>{result}</>);

      const link = container.querySelector('a');
      expect(link?.getAttribute('href')).toBe('http://kibana/app/www.elastic.co');
    });

    test('should assume a relative url if the value is not in the allow-list with a basepath', () => {
      const parsedUrl = {
        origin: 'http://kibana',
        basePath: '/xyz',
      };
      const url = new UrlFormat({ parsedUrl });

      const result = url.convertToReact('www.elastic.co');
      const { container } = render(<>{result}</>);

      const link = container.querySelector('a');
      expect(link?.getAttribute('href')).toBe('http://kibana/xyz/app/www.elastic.co');
    });

    test('should fail gracefully if there are no parsedUrl provided', () => {
      const url = new UrlFormat({});

      // Without parsedUrl, relative URLs are returned as-is (no link)
      const result1 = url.convertToReact('../app/kibana');
      const { container: container1 } = render(<>{result1}</>);
      expect(container1.textContent).toBe('../app/kibana');
      expect(container1.querySelector('a')).toBeNull();

      // Absolute URLs still work
      const result2 = url.convertToReact('http://www.elastic.co');
      const { container: container2 } = render(<>{result2}</>);
      const link = container2.querySelector('a');
      expect(link?.getAttribute('href')).toBe('http://www.elastic.co');
    });

    test('should support multiple types of relative urls', () => {
      const parsedUrl = {
        origin: 'http://kibana.host.com',
        pathname: '/nbc/app/discover#/',
        basePath: '/nbc',
      };
      const url = new UrlFormat({ parsedUrl });

      const result = url.convertToReact('#/foo');
      const { container } = render(<>{result}</>);
      const link = container.querySelector('a');
      expect(link?.getAttribute('href')).toBe('http://kibana.host.com/nbc/app/discover#/#/foo');
    });
  });

  describe('htmlConvert', () => {
    test('throws an error', () => {
      const url = new UrlFormat({});

      expect(() => url.convert('http://elastic.co', 'html')).toThrow(
        'UrlFormat does not support HTML rendering'
      );
    });
  });
});
