/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EMPTY_LABEL, NULL_LABEL } from '@kbn/field-formats-common';
import { StringFormat } from './string';
import { highlightTags } from '../utils/highlight/highlight_tags';
import {
  expectReactElementWithNull,
  expectReactElementWithBlank,
  expectReactElementAsArray,
  renderReactNode,
} from '../test_utils';

const hl = (word: string) => `${highlightTags.pre}${word}${highlightTags.post}`;

describe('String Format', () => {
  test('convert a string to lower case', () => {
    const string = new StringFormat(
      {
        transform: 'lower',
      },
      jest.fn()
    );
    expect(string.convertToText('Kibana')).toBe('kibana');
    expect(string.convertToReact('Kibana')).toBe('kibana');
  });

  test('convert a string to upper case', () => {
    const string = new StringFormat(
      {
        transform: 'upper',
      },
      jest.fn()
    );
    expect(string.convertToText('Kibana')).toBe('KIBANA');
    expect(string.convertToReact('Kibana')).toBe('KIBANA');
  });

  test('decode a base64 string', () => {
    const string = new StringFormat(
      {
        transform: 'base64',
      },
      jest.fn()
    );
    expect(string.convertToText('Zm9vYmFy')).toBe('foobar');
    expect(string.convertToReact('Zm9vYmFy')).toBe('foobar');
  });

  test('decode a base64 string with multi-byte UTF-8 characters', () => {
    const string = new StringFormat(
      {
        transform: 'base64',
      },
      jest.fn()
    );
    const base64 = Buffer.from('été', 'utf8').toString('base64');
    expect(string.convertToText(base64)).toBe('été');
    expect(string.convertToReact(base64)).toBe('été');
  });

  test('decode a base64 string when window.atob is unavailable', () => {
    const string = new StringFormat(
      {
        transform: 'base64',
      },
      jest.fn()
    );
    const originalAtob = window.atob;
    Object.defineProperty(window, 'atob', { value: undefined, configurable: true, writable: true });
    try {
      expect(string.convertToText('Zm9vYmFy')).toBe('foobar');
      expect(string.convertToText(Buffer.from('été', 'utf8').toString('base64'))).toBe('été');
    } finally {
      Object.defineProperty(window, 'atob', {
        value: originalAtob,
        configurable: true,
        writable: true,
      });
    }
  });

  test('convert a string to title case', () => {
    const string = new StringFormat(
      {
        transform: 'title',
      },
      jest.fn()
    );
    expect(string.convertToText('PLEASE DO NOT SHOUT')).toBe('Please Do Not Shout');
    expect(string.convertToReact('PLEASE DO NOT SHOUT')).toBe('Please Do Not Shout');
    expect(string.convertToText('Mean, variance and standard_deviation.')).toBe(
      'Mean, Variance And Standard_deviation.'
    );
    expect(string.convertToReact('Mean, variance and standard_deviation.')).toBe(
      'Mean, Variance And Standard_deviation.'
    );
    expect(string.convertToText('Stay CALM!')).toBe('Stay Calm!');
    expect(string.convertToReact('Stay CALM!')).toBe('Stay Calm!');
  });

  test('convert a string to short case', () => {
    const string = new StringFormat(
      {
        transform: 'short',
      },
      jest.fn()
    );
    expect(string.convertToText('dot.notated.string')).toBe('d.n.string');
    expect(string.convertToReact('dot.notated.string')).toBe('d.n.string');
  });

  test('convert a string to unknown transform case', () => {
    const string = new StringFormat(
      {
        transform: 'unknown_transform',
      },
      jest.fn()
    );
    const value = 'test test test';
    expect(string.convertToText(value)).toBe(value);
    expect(string.convertToReact(value)).toBe(value);
  });

  test('decode a URL Param string', () => {
    const string = new StringFormat(
      {
        transform: 'urlparam',
      },
      jest.fn()
    );
    expect(string.convertToText('%EC%95%88%EB%85%95%20%ED%82%A4%EB%B0%94%EB%82%98')).toBe(
      '안녕 키바나'
    );
    expect(string.convertToReact('%EC%95%88%EB%85%95%20%ED%82%A4%EB%B0%94%EB%82%98')).toBe(
      '안녕 키바나'
    );
  });

  test('outputs specific empty value', () => {
    const string = new StringFormat();
    expect(string.convertToText('')).toBe(EMPTY_LABEL);
    expectReactElementWithBlank(string.convertToReact(''));
  });

  test('outputs specific missing value', () => {
    const string = new StringFormat();
    expect(string.convertToText(null)).toBe(NULL_LABEL);
    expect(string.convertToText(undefined)).toBe(NULL_LABEL);
    expectReactElementWithNull(string.convertToReact(null));
    expectReactElementWithNull(string.convertToReact(undefined));
  });

  test('does escape value while highlighting', () => {
    const string = new StringFormat();
    const options = {
      field: { name: 'foo' },
      hit: {
        highlight: { foo: ['@kibana-highlighted-field@<img />@/kibana-highlighted-field@'] },
      },
    };
    const container = renderReactNode(string.convertToReact('<img />', options));
    expect(container.querySelector('mark')).toHaveTextContent('<img />');
    expect(container.querySelector('img')).not.toBeInTheDocument();
  });

  describe('highlighting with transforms', () => {
    const highlight = (
      value: string,
      transform: string | false,
      snippets: string[],
      fieldName = 'foo'
    ) => {
      const string = new StringFormat(transform ? { transform } : {}, jest.fn());
      return renderReactNode(
        string.convertToReact(value, {
          field: { name: fieldName },
          hit: { highlight: { [fieldName]: snippets } },
        })
      );
    };

    test('highlights while applying the lower case transform', () => {
      const container = highlight('Hello World', 'lower', [`Hello ${hl('World')}`]);
      expect(container).toHaveTextContent('hello world');
      expect(container.querySelector('mark')).toHaveTextContent('world');
    });

    test('highlights while applying the upper case transform', () => {
      const container = highlight('Hello World', 'upper', [`Hello ${hl('World')}`]);
      expect(container).toHaveTextContent('HELLO WORLD');
      expect(container.querySelector('mark')).toHaveTextContent('WORLD');
    });

    test('highlights while applying the title case transform', () => {
      const container = highlight('hello world', 'title', [`hello ${hl('world')}`]);
      expect(container).toHaveTextContent('Hello World');
      expect(container.querySelector('mark')).toHaveTextContent('World');
    });

    test('highlights a sub-word match while applying the title case transform', () => {
      const container = highlight('paymentprocessor', 'title', [`${hl('pay')}mentprocessor`]);
      expect(container).toHaveTextContent('Paymentprocessor');
      expect(container.querySelector('mark')).toHaveTextContent('Pay');
    });

    test('does not highlight short-dots values', () => {
      // Short Dots removes characters, so a transformed snippet can no longer be located within
      // the shortened value; highlighting is dropped rather than shown at the wrong position.
      const container = highlight('dot.notated.string', 'short', [hl('dot.notated.string')]);
      expect(container).toHaveTextContent('d.n.string');
      expect(container.querySelector('mark')).not.toBeInTheDocument();
    });

    test('does not highlight base64-decoded values', () => {
      const container = highlight('Zm9vYmFy', 'base64', [hl('Zm9vYmFy')]);
      expect(container).toHaveTextContent('foobar');
      expect(container.querySelector('mark')).not.toBeInTheDocument();
    });

    test('does not highlight url-param-decoded values', () => {
      const container = highlight('%20foo', 'urlparam', [hl('%20foo')]);
      expect(container.textContent).toBe(' foo');
      expect(container.querySelector('mark')).not.toBeInTheDocument();
    });

    test('highlights with no transform configured', () => {
      const container = highlight('lorem ipsum', false, [`lorem ${hl('ipsum')}`]);
      expect(container).toHaveTextContent('lorem ipsum');
      expect(container.querySelector('mark')).toHaveTextContent('ipsum');
    });
  });

  test('convertToReact returns raw string for unhighlighted content (React escapes at render)', () => {
    expect(new StringFormat().convertToReact('<script>alert("test")</script>')).toBe(
      '<script>alert("test")</script>'
    );
  });

  test('wraps a multi-value array with bracket notation', () => {
    const string = new StringFormat();

    expect(string.convertToText(['foo', 'bar'])).toBe('["foo","bar"]');
    expectReactElementAsArray(string.convertToReact(['foo', 'bar']), ['foo', 'bar']);
  });

  test('returns the single element without brackets for a one-element array', () => {
    const string = new StringFormat();

    expect(string.convertToText(['hello'])).toBe('["hello"]');
    expect(string.convertToReact(['hello'])).toBe('hello');
  });

  test('returns empty for an empty array', () => {
    const string = new StringFormat();

    expect(string.convertToText([])).toBe('[]');
    expect(string.convertToReact([])).toBe('');
  });
});
