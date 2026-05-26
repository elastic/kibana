/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isTruncated, isTruncatedDeep, stripTruncationClasses } from './truncation_helpers';

describe('isTruncated', () => {
  it('should detect truncation by class-name pattern', () => {
    const el = document.createElement('div');
    el.classList.add('css-abc-menu_item--truncatedStyles');

    expect(isTruncated(el)).toBe(true);
  });

  it('should not treat arbitrary class names containing truncat text as truncation', () => {
    const el = document.createElement('div');
    el.classList.add('layout-truncateable-container');

    expect(isTruncated(el)).toBe(false);
  });

  it('should detect computed text-overflow truncation when connected', () => {
    const el = document.createElement('div');
    document.body.appendChild(el);
    jest.spyOn(window, 'getComputedStyle').mockReturnValue({
      textOverflow: 'ellipsis',
      webkitLineClamp: '',
    } as CSSStyleDeclaration);

    expect(isTruncated(el)).toBe(true);

    jest.restoreAllMocks();
    el.remove();
  });
});

describe('isTruncatedDeep', () => {
  it('should detect truncation on descendants', () => {
    const root = document.createElement('div');
    const child = document.createElement('span');
    child.classList.add('eui-textTruncate');
    root.appendChild(child);

    expect(isTruncatedDeep(root)).toBe(true);
  });
});

describe('stripTruncationClasses', () => {
  it('should remove known truncation classes', () => {
    const clone = document.createElement('div');
    clone.classList.add('eui-textTruncate');

    const result = stripTruncationClasses(clone);

    expect(result).toBe(true);
    expect(clone.classList.contains('eui-textTruncate')).toBe(false);
  });

  it('should remove truncation-like generated class names', () => {
    const clone = document.createElement('div');
    clone.classList.add('css-ugua3-euiText-m-menu_item--truncatedStyles');

    const result = stripTruncationClasses(clone);

    expect(result).toBe(true);
    expect(clone.className).toBe('');
  });

  it('should use source computed style and neutralize truncation props', () => {
    const source = document.createElement('div');
    document.body.appendChild(source);
    const clone = document.createElement('div');

    jest.spyOn(window, 'getComputedStyle').mockReturnValue({
      textOverflow: 'ellipsis',
      webkitLineClamp: '',
    } as CSSStyleDeclaration);

    const result = stripTruncationClasses(clone, source);

    expect(result).toBe(true);
    expect(clone.style.getPropertyValue('text-overflow')).toBe('clip');
    expect(clone.style.getPropertyValue('overflow')).toBe('visible');

    jest.restoreAllMocks();
    source.remove();
  });

  it('should not remove unrelated class names with truncat text', () => {
    const clone = document.createElement('div');
    clone.classList.add('layout-truncateable-container');

    const result = stripTruncationClasses(clone);

    expect(result).toBe(false);
    expect(clone.classList.contains('layout-truncateable-container')).toBe(true);
    expect(clone.style.getPropertyValue('text-overflow')).toBe('');
  });

  it('should only force overflow visible when truncation was actually detected', () => {
    const source = document.createElement('div');
    document.body.appendChild(source);
    const clone = document.createElement('div');
    clone.classList.add('layout-truncateable-container');

    jest.spyOn(window, 'getComputedStyle').mockReturnValue({
      textOverflow: 'clip',
      webkitLineClamp: '',
    } as CSSStyleDeclaration);

    const result = stripTruncationClasses(clone, source);

    expect(result).toBe(false);
    expect(clone.style.getPropertyValue('overflow')).toBe('');

    jest.restoreAllMocks();
    source.remove();
  });
});
