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
import { DEFAULT_HIGHLIGHT_POST_TAG, DEFAULT_HIGHLIGHT_PRE_TAG } from '@kbn/esql-utils';
import { getHighlightCellRenderer } from './highlight_cell_renderer';

const defaultTags = {
  preTag: DEFAULT_HIGHLIGHT_PRE_TAG,
  postTag: DEFAULT_HIGHLIGHT_POST_TAG,
};

const renderHighlightCell = (value: unknown, tags = defaultTags) =>
  render(<>{getHighlightCellRenderer(value, tags)}</>);

describe('getHighlightCellRenderer', () => {
  it('returns a dash for undefined values', () => {
    expect(getHighlightCellRenderer(undefined, defaultTags)).toBe('-');
  });

  it('returns non string values as they are', () => {
    expect(getHighlightCellRenderer(42, defaultTags)).toBe('42');
    expect(getHighlightCellRenderer(null, defaultTags)).toBe('null');
  });

  it('renders plain text when highlight tags are absent', () => {
    const { container } = renderHighlightCell('no highlights here');
    expect(container.textContent).toBe('no highlights here');
    expect(container.querySelector('mark.ffSearch__highlight')).toBeNull();
  });

  it('wraps highlighted segments in mark.ffSearch__highlight using default em tags', () => {
    const { container } = renderHighlightCell('before <em>HIHGLIGHTED</em> after');
    expect(container.textContent).toBe('before HIHGLIGHTED after');
    const mark = container.querySelector('mark.ffSearch__highlight');
    expect(mark).not.toBeNull();
    expect(mark?.textContent).toBe('HIHGLIGHTED');
  });

  it('supports custom pre and post tags from TOP_SNIPPETS options', () => {
    const tags = { preTag: '<mark>', postTag: '</mark>' };
    const { container } = renderHighlightCell('text <mark>HIHGLIGHTED</mark> end', tags);
    expect(container.textContent).toBe('text HIHGLIGHTED end');
    expect(container.querySelector('mark.ffSearch__highlight')?.textContent).toBe('HIHGLIGHTED');
  });

  it('renders multiple highlighted segments', () => {
    const { container } = renderHighlightCell('<em>HIHGLIGHTED</em> and <em>HIHGLIGHTED TWO</em>');
    const marks = container.querySelectorAll('mark.ffSearch__highlight');
    expect(marks).toHaveLength(2);
    expect(marks[0].textContent).toBe('HIHGLIGHTED');
    expect(marks[1].textContent).toBe('HIHGLIGHTED TWO');
  });

  it('leaves text as is after an unclosed highlight tag unwrapped', () => {
    const { container } = renderHighlightCell('prefix <em>open only');
    expect(container.textContent).toBe('prefix <em>open only');
    expect(container.querySelector('mark.ffSearch__highlight')).toBeNull();
  });
});
