/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React from 'react';
import { Markdown } from '@kbn/kibana-react-plugin/public';
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
    const text = elementToString(<Markdown markdown={`## Markdown goes here `} />);
    expect(text).toEqual('## Markdown goes here ');
  });

  test('Should convert to string if children with markdown are passed', () => {
    const text = elementToString(
      <>
        <h1>Meow</h1>
        <Markdown markdown={`## Markdown goes here `} />
      </>
    );
    expect(text).toEqual('## Markdown goes here ');
  });
});
