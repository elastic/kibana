/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { extractTextFromReactNode } from './extract_text_from_react_node';

describe('extractTextFromReactNode', () => {
  it('returns empty string for null', () => {
    expect(extractTextFromReactNode(null)).toBe('');
  });

  it('returns empty string for undefined', () => {
    expect(extractTextFromReactNode(undefined)).toBe('');
  });

  it('returns empty string for booleans', () => {
    expect(extractTextFromReactNode(true)).toBe('');
    expect(extractTextFromReactNode(false)).toBe('');
  });

  it('returns the string as-is', () => {
    expect(extractTextFromReactNode('hello world')).toBe('hello world');
  });

  it('converts a number to string', () => {
    expect(extractTextFromReactNode(42)).toBe('42');
    expect(extractTextFromReactNode(3.14)).toBe('3.14');
  });

  it('extracts text from a simple React element', () => {
    expect(extractTextFromReactNode(<mark>highlighted</mark>)).toBe('highlighted');
  });

  it('extracts text from a nested React element', () => {
    expect(
      extractTextFromReactNode(
        <span>
          <mark>inner</mark>
        </span>
      )
    ).toBe('inner');
  });

  it('extracts text from a React element with multiple children', () => {
    expect(
      extractTextFromReactNode(
        <span>
          {'before '}
          <mark>middle</mark>
          {' after'}
        </span>
      )
    ).toBe('before middle after');
  });

  it('extracts and joins text from a flat array of strings', () => {
    expect(extractTextFromReactNode(['foo', 'bar', 'baz'])).toBe('foobarbaz');
  });

  it('extracts text from a mixed array of strings and React elements', () => {
    const node = ['before ', <mark key="1">highlight</mark>, ' after'];
    expect(extractTextFromReactNode(node)).toBe('before highlight after');
  });

  it('extracts text from a React element with no children', () => {
    expect(extractTextFromReactNode(<br />)).toBe('');
  });

  it('returns empty string for an empty array', () => {
    expect(extractTextFromReactNode([])).toBe('');
  });
});
