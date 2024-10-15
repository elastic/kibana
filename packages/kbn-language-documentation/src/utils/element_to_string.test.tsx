/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { Markdown } from '@kbn/shared-ux-markdown';
import { elementToString } from './element_to_string';

describe('elementToString', () => {
  test('Should return empty string if no element is given', () => {
    const text = elementToString(undefined);
    expect(text).toEqual('');
  });

  test('Should return empty string if no markdown is passed', () => {
    const text = elementToString(<span>Meow</span>);
    expect(text).toEqual('');
  });

  test('Should convert to string if markdown is passed', () => {
    const text = elementToString(<Markdown markdownContent="## Markdown goes here " readOnly />);
    expect(text).toEqual('## Markdown goes here ');
  });

  test('Should convert to string if children with markdown are passed', () => {
    const text = elementToString(
      <>
        <h1>Meow</h1>
        <Markdown markdownContent="## Markdown goes here " readOnly />
      </>
    );
    expect(text).toEqual('## Markdown goes here ');
  });
});
