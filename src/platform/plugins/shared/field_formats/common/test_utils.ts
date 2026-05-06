/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isValidElement, type ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { NULL_LABEL, EMPTY_LABEL } from '@kbn/field-formats-common';

const EMPTY_VALUE_CLASS = 'ffString__emptyValue';
const ARRAY_HIGHLIGHT_CLASS = 'ffArray__highlight';

/**
 * Asserts that a React element represents a null value display.
 * Expects a span with className "ffString__emptyValue" and text "(null)".
 */
export const expectReactElementWithNull = (element: React.ReactNode) => {
  expect(isValidElement(element)).toBe(true);
  const el = element as ReactElement;
  expect(el.type).toBe('span');
  expect(el.props.className).toBe(EMPTY_VALUE_CLASS);
  expect(el.props.children).toBe(NULL_LABEL);
};

/**
 * Asserts that a React element represents a blank value display.
 * Expects a span with className "ffString__emptyValue" and text "(blank)".
 */
export const expectReactElementWithBlank = (element: React.ReactNode) => {
  expect(isValidElement(element)).toBe(true);
  const el = element as ReactElement;
  expect(el.type).toBe('span');
  expect(el.props.className).toBe(EMPTY_VALUE_CLASS);
  expect(el.props.children).toBe(EMPTY_LABEL);
};

/**
 * Asserts that a React element represents an array with bracket notation.
 * Expects a structure like: [value1, value2, ...] where brackets and commas
 * are wrapped in spans with className "ffArray__highlight".
 */
export const expectReactElementAsArray = (element: React.ReactNode, expectedValues: string[]) => {
  expect(isValidElement(element)).toBe(true);

  const html = renderToStaticMarkup(element as ReactElement);

  const bracket = (char: string) => `<span class="${ARRAY_HIGHLIGHT_CLASS}">${char}</span>`;
  const expectedHtml = bracket('[') + expectedValues.join(`${bracket(',')} `) + bracket(']');

  expect(html).toBe(expectedHtml);
};
