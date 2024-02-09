/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React from 'react';
import { Markdown } from '@kbn/shared-ux-markdown';
import { elementToString } from './element_to_string';

describe('elementToString', () => {
  test('Should return empty string if no element is given', () => {
    const text = elementToString(undefined);
    expect(text).toEqual('');
  });

  test('Should return the content even if no markdown is passed', () => {
    const text = elementToString(<span>Meow</span>);
    expect(text).toEqual('Meow');
  });

  test('Should convert to string if markdown is passed', () => {
    const text = elementToString(<Markdown readOnly>## Markdown goes here</Markdown>);
    expect(text).toEqual('## Markdown goes here');
  });

  test('Should convert to string if children with markdown are passed', () => {
    const text = elementToString(
      <>
        <Markdown readOnly>## Woof and Meow </Markdown>
        <Markdown readOnly>## Markdown goes here </Markdown>
      </>
    );
    expect(text).toEqual('## Woof and Meow ## Markdown goes here ');
  });
});
