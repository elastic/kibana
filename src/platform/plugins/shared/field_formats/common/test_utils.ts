/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { render } from '@testing-library/react';
import { isValidElement, type ReactNode } from 'react';
import { NULL_LABEL, EMPTY_LABEL } from '@kbn/field-formats-common';

export const renderReactNode = (node: ReactNode) => render(node).container;

/**
 * Asserts that a React element represents a null value display.
 */
export const expectReactElementWithNull = (element: React.ReactNode) => {
  expect(isValidElement(element)).toBe(true);
  const { children } = renderReactNode(element);
  expect(children).toHaveLength(1);
  expect(children[0]).toHaveTextContent(NULL_LABEL);
};

/**
 * Asserts that a React element represents a blank value display.
 */
export const expectReactElementWithBlank = (element: React.ReactNode) => {
  expect(isValidElement(element)).toBe(true);
  const { children } = renderReactNode(element);
  expect(children).toHaveLength(1);
  expect(children[0]).toHaveTextContent(EMPTY_LABEL);
};

/**
 * Asserts that a React element represents an array with bracket notation.
 */
export const expectReactElementAsArray = (element: React.ReactNode, expectedValues: string[]) => {
  expect(isValidElement(element)).toBe(true);

  const container = renderReactNode(element);
  expect(container.textContent).toBe(`[${expectedValues.join(', ')}]`);
  expect([...container.querySelectorAll('span')].map(({ textContent }) => textContent)).toEqual([
    '[',
    ...expectedValues.slice(1).map(() => ','),
    ']',
  ]);
};
