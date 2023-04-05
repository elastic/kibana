/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { getTruncatedText } from './utils';

describe('getTruncatedText', () => {
  it('should return truncated text correctly', () => {
    const sampleText = 'This is a sample text!!';
    const res = getTruncatedText(sampleText, 4);

    expect(res).toEqual('This...');
  });

  it('should return original text if text is empty', () => {
    const res = getTruncatedText('', 4);

    expect(res).toEqual('');
  });

  it('should return empty text if text is empty', () => {
    const res = getTruncatedText('', 10);

    expect(res).toEqual('');
  });

  it('should return original text if truncate length is negative', () => {
    const sampleText = 'This is a sample text!!';
    const res = getTruncatedText(sampleText, -4);

    expect(res).toEqual(sampleText);
  });

  it('should return original text if truncate length is zero', () => {
    const sampleText = 'This is a sample text!!';
    const res = getTruncatedText(sampleText, 0);

    expect(res).toEqual(sampleText);
  });

  it('should return original text if text is smaller than truncate length number', () => {
    const sampleText = 'This is a sample text!!';
    const res = getTruncatedText(sampleText, 50);

    expect(res).toEqual(sampleText);
  });
});
