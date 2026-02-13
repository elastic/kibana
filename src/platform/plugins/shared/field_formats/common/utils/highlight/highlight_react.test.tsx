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
import { getHighlightReact, SEARCH_HIGHLIGHT_CLASS } from './highlight_react';
import { highlightTags } from './highlight_tags';

describe('getHighlightReact', () => {
  it('returns the field value as-is when no highlights are provided', () => {
    const result = getHighlightReact('test value', undefined);
    const { container } = render(<>{result}</>);

    expect(container.textContent).toBe('test value');
  });

  it('returns the field value as-is when highlights array is empty', () => {
    const result = getHighlightReact('test value', []);
    const { container } = render(<>{result}</>);

    expect(container.textContent).toBe('test value');
  });

  it('highlights a single match', () => {
    const fieldValue = 'Hello world';
    const highlights = [`Hello ${highlightTags.pre}world${highlightTags.post}`];

    const result = getHighlightReact(fieldValue, highlights);
    const { container } = render(<>{result}</>);

    // Check full text content
    expect(container.textContent).toBe('Hello world');

    // Check that "world" is highlighted
    const marks = container.querySelectorAll(`.${SEARCH_HIGHLIGHT_CLASS}`);
    expect(marks).toHaveLength(1);
    expect(marks[0].textContent).toBe('world');
  });

  it('highlights multiple matches of the same term', () => {
    const fieldValue = 'foo bar foo';
    const highlights = [
      `${highlightTags.pre}foo${highlightTags.post} bar ${highlightTags.pre}foo${highlightTags.post}`,
    ];

    const result = getHighlightReact(fieldValue, highlights);
    const { container } = render(<>{result}</>);

    expect(container.textContent).toBe('foo bar foo');

    const marks = container.querySelectorAll(`.${SEARCH_HIGHLIGHT_CLASS}`);
    expect(marks).toHaveLength(2);
    expect(marks[0].textContent).toBe('foo');
    expect(marks[1].textContent).toBe('foo');
  });

  it('highlights multiple different terms', () => {
    const fieldValue = 'apple banana cherry';
    const highlights = [
      `${highlightTags.pre}apple${highlightTags.post} banana ${highlightTags.pre}cherry${highlightTags.post}`,
    ];

    const result = getHighlightReact(fieldValue, highlights);
    const { container } = render(<>{result}</>);

    expect(container.textContent).toBe('apple banana cherry');

    const marks = container.querySelectorAll(`.${SEARCH_HIGHLIGHT_CLASS}`);
    expect(marks).toHaveLength(2);
    expect(marks[0].textContent).toBe('apple');
    expect(marks[1].textContent).toBe('cherry');
  });

  it('handles JSON objects as field values', () => {
    const fieldValue = { key: 'value' };
    const highlights = [`{"${highlightTags.pre}key${highlightTags.post}":"value"}`];

    const result = getHighlightReact(fieldValue, highlights);
    const { container } = render(<>{result}</>);

    expect(container.textContent).toBe('{"key":"value"}');

    const marks = container.querySelectorAll(`.${SEARCH_HIGHLIGHT_CLASS}`);
    expect(marks).toHaveLength(1);
    expect(marks[0].textContent).toBe('key');
  });

  it('handles overlapping highlight regions by merging them', () => {
    const fieldValue = 'abcdef';
    // Two highlights that overlap: "bcd" and "cde"
    const highlights = [
      `a${highlightTags.pre}bcd${highlightTags.post}ef`,
      `ab${highlightTags.pre}cde${highlightTags.post}f`,
    ];

    const result = getHighlightReact(fieldValue, highlights);
    const { container } = render(<>{result}</>);

    expect(container.textContent).toBe('abcdef');

    // Should merge into one highlight covering "bcde"
    const marks = container.querySelectorAll(`.${SEARCH_HIGHLIGHT_CLASS}`);
    expect(marks).toHaveLength(1);
    expect(marks[0].textContent).toBe('bcde');
  });

  it('preserves text before the first highlight', () => {
    const fieldValue = 'prefix match suffix';
    const highlights = [`prefix ${highlightTags.pre}match${highlightTags.post} suffix`];

    const result = getHighlightReact(fieldValue, highlights);
    const { container } = render(<>{result}</>);

    expect(container.textContent).toBe('prefix match suffix');

    const marks = container.querySelectorAll(`.${SEARCH_HIGHLIGHT_CLASS}`);
    expect(marks).toHaveLength(1);
    expect(marks[0].textContent).toBe('match');
  });

  it('preserves text after the last highlight', () => {
    const fieldValue = 'start word end';
    const highlights = [`start ${highlightTags.pre}word${highlightTags.post} end`];

    const result = getHighlightReact(fieldValue, highlights);
    const { container } = render(<>{result}</>);

    expect(container.textContent).toBe('start word end');
  });

  it('handles highlight at the start of the string', () => {
    const fieldValue = 'start rest of text';
    const highlights = [`${highlightTags.pre}start${highlightTags.post} rest of text`];

    const result = getHighlightReact(fieldValue, highlights);
    const { container } = render(<>{result}</>);

    const marks = container.querySelectorAll(`.${SEARCH_HIGHLIGHT_CLASS}`);
    expect(marks).toHaveLength(1);
    expect(marks[0].textContent).toBe('start');
  });

  it('handles highlight at the end of the string', () => {
    const fieldValue = 'text before end';
    const highlights = [`text before ${highlightTags.pre}end${highlightTags.post}`];

    const result = getHighlightReact(fieldValue, highlights);
    const { container } = render(<>{result}</>);

    const marks = container.querySelectorAll(`.${SEARCH_HIGHLIGHT_CLASS}`);
    expect(marks).toHaveLength(1);
    expect(marks[0].textContent).toBe('end');
  });

  it('handles entire string being highlighted', () => {
    const fieldValue = 'everything';
    const highlights = [`${highlightTags.pre}everything${highlightTags.post}`];

    const result = getHighlightReact(fieldValue, highlights);
    const { container } = render(<>{result}</>);

    const marks = container.querySelectorAll(`.${SEARCH_HIGHLIGHT_CLASS}`);
    expect(marks).toHaveLength(1);
    expect(marks[0].textContent).toBe('everything');
    expect(container.textContent).toBe('everything');
  });
});
