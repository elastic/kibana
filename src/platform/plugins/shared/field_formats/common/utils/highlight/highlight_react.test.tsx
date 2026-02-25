/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { isValidElement } from 'react';
import { render } from '@testing-library/react';
import { highlightTags } from './highlight_tags';
import { getHighlightReact } from './highlight_react';

const { pre, post } = highlightTags;

describe('getHighlightReact', () => {
  const text =
    'Bacon ipsum dolor amet pork loin pork cow pig beef chuck ground round shankle sirloin landjaeger kevin ' +
    'venison sausage ribeye tongue. Chicken bacon ball tip pork. Brisket pork capicola spare ribs pastrami rump ' +
    'sirloin, t-bone ham shoulder jerky turducken bresaola. Chicken cow beef picanha. Picanha hamburger alcatra ' +
    'cupim. Salami capicola boudin pork belly shank picanha.';

  test('should not modify text if highlight is empty', () => {
    expect(getHighlightReact(text, undefined)).toBe(text);
    expect(getHighlightReact(text, null)).toBe(text);
    expect(getHighlightReact(text, [])).toBe(text);
  });

  test('should highlight a single result', () => {
    const highlights = [
      `${pre}hamburger${post} alcatra cupim. Salami capicola boudin pork belly shank picanha.`,
    ];
    const result = getHighlightReact(text, highlights);
    expect(isValidElement(result)).toBe(true);
    const { container } = render(<>{result}</>);
    const marks = container.querySelectorAll('mark');
    expect(marks).toHaveLength(1);
    expect(marks[0].textContent).toBe('hamburger');
    expect(container.textContent).toBe(text);
  });

  test('should highlight multiple results from a single snippet', () => {
    const highlights = [
      `kevin venison sausage ribeye tongue. ${pre}Chicken${post} bacon ball tip pork. Brisket ` +
        `pork capicola spare ribs pastrami rump sirloin, t-bone ham shoulder jerky turducken bresaola. ` +
        `${pre}Chicken${post} cow beef picanha. Picanha`,
    ];
    const result = getHighlightReact(text, highlights);
    const { container } = render(<>{result}</>);
    const marks = container.querySelectorAll('mark');
    expect(marks.length).toBeGreaterThanOrEqual(2);
    marks.forEach((mark) => expect(mark.textContent).toBe('Chicken'));
    expect(container.textContent).toBe(text);
  });

  test('should highlight multiple hits across multiple snippets', () => {
    const highlights = [
      `Bacon ipsum dolor amet ${pre}pork${post} loin ${pre}pork${post} cow pig beef chuck ground round shankle sirloin landjaeger`,
      `kevin venison sausage ribeye tongue. Chicken bacon ball tip ${pre}pork${post}. Brisket ${pre}pork${post} capicola spare ribs`,
      `hamburger alcatra cupim. Salami capicola boudin ${pre}pork${post} belly shank picanha.`,
    ];
    const result = getHighlightReact(text, highlights);
    const { container } = render(<>{result}</>);
    const marks = container.querySelectorAll('mark');
    const porkCount = text.split('pork').length - 1;
    expect(marks).toHaveLength(porkCount);
    marks.forEach((mark) => expect(mark.textContent).toBe('pork'));
    expect(container.textContent).toBe(text);
  });

  test('should handle XSS in field values safely', () => {
    const xss = '<script>alert("xss")</script>';
    const highlights = [`${pre}${xss}${post}`];
    const result = getHighlightReact(xss, highlights);
    const { container } = render(<>{result}</>);
    expect(container.querySelector('script')).toBeNull();
    expect(container.querySelector('mark')?.textContent).toBe(xss);
  });

  test('should accept an object and return a string containing its properties', () => {
    const obj = { foo: 1, bar: 2 };
    const result = getHighlightReact(obj, null);
    expect(typeof result).toBe('string');
    expect(result).toContain('foo');
    expect(result).toContain('bar');
  });

  test('should return plain text when no highlights match', () => {
    const highlights = [`${pre}nomatch${post}`];
    const result = getHighlightReact('hello world', highlights);
    expect(result).toBe('hello world');
  });

  test('should highlight different terms from different snippets', () => {
    const value = 'the quick brown fox jumps over the lazy dog';
    const highlights = [`the ${pre}quick${post} brown fox`, `over the ${pre}lazy${post} dog`];
    const result = getHighlightReact(value, highlights);
    const { container } = render(<>{result}</>);
    const marks = container.querySelectorAll('mark');
    expect(marks).toHaveLength(2);
    expect(marks[0].textContent).toBe('quick');
    expect(marks[1].textContent).toBe('lazy');
    expect(container.textContent).toBe(value);
  });
});
