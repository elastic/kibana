/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import ReactDOM from 'react-dom/server';
import { highlightTags } from './highlight_tags';
import {
  getFieldHighlightReact,
  getHighlightReact,
  getInlineTagHighlightReact,
} from './highlight_react';

/** Render the ReactNode to a plain HTML string for easy assertion.
 * &quot; is decoded back to " since both are valid HTML and the difference is
 * an implementation detail of renderToStaticMarkup, not semantically meaningful.
 */
function render(node: React.ReactNode): string {
  return ReactDOM.renderToStaticMarkup(<>{node}</>).replace(/&quot;/g, '"');
}

const hl = (word: string) => `${highlightTags.pre}${word}${highlightTags.post}`;
const mark = (word: string) => `<mark class="ffSearch__highlight">${word}</mark>`;

describe('getHighlightReact', () => {
  const check = (value: string, highlights: string[] | undefined | null, expected: string) => {
    expect(render(getHighlightReact(value, highlights))).toBe(expected);
  };

  test('returns plain string unchanged when highlights are empty', () => {
    check('lorem ipsum', undefined, 'lorem ipsum');
    check('lorem ipsum', null, 'lorem ipsum');
    check('lorem ipsum', [], 'lorem ipsum');
  });

  test('returns plain string unchanged when no highlight matches', () => {
    check('lorem ipsum', [`${hl('dolor')}`], 'lorem ipsum');
  });

  test('highlights a single word at the start', () => {
    check('lorem ipsum dolor', [`${hl('lorem')} ipsum dolor`], `${mark('lorem')} ipsum dolor`);
  });

  test('highlights a single word in the middle', () => {
    check('lorem ipsum dolor', [`lorem ${hl('ipsum')} dolor`], `lorem ${mark('ipsum')} dolor`);
  });

  test('highlights a single word at the end', () => {
    check('lorem ipsum dolor', [`lorem ipsum ${hl('dolor')}`], `lorem ipsum ${mark('dolor')}`);
  });

  test('highlights two words within one highlight entry', () => {
    check(
      'lorem ipsum dolor sit',
      [`lorem ${hl('ipsum')} dolor ${hl('sit')}`],
      `lorem ${mark('ipsum')} dolor ${mark('sit')}`
    );
  });

  test('highlights the same word appearing multiple times via multiple highlight entries', () => {
    check(
      'lorem ipsum lorem ipsum lorem',
      [`${hl('lorem')} ipsum lorem`, `ipsum ${hl('lorem')} ipsum ${hl('lorem')}`],
      `${mark('lorem')} ipsum ${mark('lorem')} ipsum ${mark('lorem')}`
    );
  });

  test('highlights words from entries with different context windows', () => {
    check(
      'lorem ipsum dolor',
      [`${hl('lorem')} ipsum`, `ipsum ${hl('dolor')}`],
      `${mark('lorem')} ipsum ${mark('dolor')}`
    );
  });

  test('highlights the entire field value', () => {
    check('lorem', [`${hl('lorem')}`], mark('lorem'));
  });

  test('does not highlight partial word matches', () => {
    check('loremipsum lorem ipsum', [`lorem ${hl('ipsum')}`], `loremipsum lorem ${mark('ipsum')}`);
  });

  test('escapes HTML special characters', () => {
    check('<b>bold</b>', [`${hl('<b>bold</b>')}`], mark('&lt;b&gt;bold&lt;/b&gt;'));
    check(
      '<em>lorem</em> ipsum',
      [`${hl('ipsum')}`],
      `&lt;em&gt;lorem&lt;/em&gt; ${mark('ipsum')}`
    );
    check('<script>alert(1)</script>', [], '&lt;script&gt;alert(1)&lt;/script&gt;');
  });

  test('when highlight entries share the same untagged context only the first applies', () => {
    check(
      'lorem ipsum dolor sit',
      [`${hl('lorem')} ipsum dolor sit`, `lorem ipsum dolor ${hl('sit')}`],
      `${mark('lorem')} ipsum dolor sit`
    );
    check(
      'elastic search engine',
      [`${hl('elastic search')} engine`, `elastic ${hl('search engine')}`],
      `${mark('elastic search')} engine`
    );
    check('foobar', [`${hl('foo')}bar`, `foo${hl('bar')}`], `${mark('foo')}bar`);
  });
});

describe('getInlineTagHighlightReact', () => {
  const check = (
    value: string,
    tags: { preTag: string; postTag: string } | undefined | null,
    expected: string
  ) => {
    expect(render(getInlineTagHighlightReact(value, tags))).toBe(expected);
  };

  test('returns plain string unchanged when tags are absent', () => {
    check('lorem ipsum', undefined, 'lorem ipsum');
    check('lorem ipsum', null, 'lorem ipsum');
  });

  test('highlights inline ES|QL tags with default tags', () => {
    check(
      'lorem <em>ipsum</em> dolor',
      { preTag: '<em>', postTag: '</em>' },
      `lorem ${mark('ipsum')} dolor`
    );
  });

  test('supports custom inline ES|QL tags', () => {
    check(
      'lorem <mark>ipsum</mark> dolor',
      { preTag: '<mark>', postTag: '</mark>' },
      `lorem ${mark('ipsum')} dolor`
    );
  });

  test('highlights multiple inline ES|QL segments', () => {
    check(
      '<em>lorem</em> ipsum <em>dolor</em>',
      { preTag: '<em>', postTag: '</em>' },
      `${mark('lorem')} ipsum ${mark('dolor')}`
    );
  });

  test('escapes HTML special characters in ES|QL inline highlights', () => {
    check(
      '<em><script>alert(1)</script></em>',
      { preTag: '<em>', postTag: '</em>' },
      mark('&lt;script&gt;alert(1)&lt;/script&gt;')
    );
  });

  test('leaves malformed inline-tag content unchanged', () => {
    check('lorem <em>ipsum', { preTag: '<em>', postTag: '</em>' }, 'lorem &lt;em&gt;ipsum');
  });
});

describe('getFieldHighlightReact', () => {
  test('uses DSL highlights when available', () => {
    expect(
      render(
        getFieldHighlightReact('lorem ipsum', 'message', {
          highlight: { message: [`lorem ${hl('ipsum')}`] },
          esql_highlight: { message: { preTag: '<em>', postTag: '</em>' } },
        })
      )
    ).toBe(`lorem ${mark('ipsum')}`);
  });

  test('uses ES|QL inline-tag highlights when DSL highlights are absent', () => {
    expect(
      render(
        getFieldHighlightReact('lorem <em>ipsum</em>', 'message', {
          esql_highlight: { message: { preTag: '<em>', postTag: '</em>' } },
        })
      )
    ).toBe(`lorem ${mark('ipsum')}`);
  });

  test('returns plain text when field name is absent', () => {
    expect(
      getFieldHighlightReact('lorem <em>ipsum</em>', undefined, {
        esql_highlight: { message: { preTag: '<em>', postTag: '</em>' } },
      })
    ).toBe('lorem <em>ipsum</em>');
  });
});
