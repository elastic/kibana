/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiProvider } from '@elastic/eui';
import { createElement, isValidElement, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { NULL_LABEL, EMPTY_LABEL } from '@kbn/field-formats-common';

export const renderReactNode = (node: ReactNode) =>
  renderToStaticMarkup(createElement(EuiProvider, null, node))
    .replace(/ class="css-[^"]+"/g, '')
    .replace(/ css-[^"]+/g, '')
    .replace(/&quot;/g, '"');

/**
 * Asserts that a React element represents a null value display.
 */
export const expectReactElementWithNull = (element: React.ReactNode) => {
  expect(isValidElement(element)).toBe(true);
  expect(renderReactNode(element)).toBe(`<span>${NULL_LABEL}</span>`);
};

/**
 * Asserts that a React element represents a blank value display.
 */
export const expectReactElementWithBlank = (element: React.ReactNode) => {
  expect(isValidElement(element)).toBe(true);
  expect(renderReactNode(element)).toBe(`<span>${EMPTY_LABEL}</span>`);
};

/**
 * Asserts that a React element represents an array with bracket notation.
 */
export const expectReactElementAsArray = (element: React.ReactNode, expectedValues: string[]) => {
  expect(isValidElement(element)).toBe(true);

  const html = renderReactNode(element);

  const bracket = (char: string) => `<span>${char}</span>`;
  const expectedHtml = bracket('[') + expectedValues.join(`${bracket(',')} `) + bracket(']');

  expect(html).toBe(expectedHtml);
};
