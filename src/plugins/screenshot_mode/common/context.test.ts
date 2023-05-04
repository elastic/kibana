/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { getScreenshotContext, setScreenshotContext } from './context';

describe('getScreenshotContext', () => {
  it('should return a default value if there is no data', () => {
    expect(getScreenshotContext('key', 'default')).toBe('default');
  });
});

describe('setScreenshotContext', () => {
  it('should store data in the context', () => {
    setScreenshotContext('key', 'value');

    expect(getScreenshotContext('key')).toBe('value');
  });

  it('should not overwrite data on repetitive calls', () => {
    setScreenshotContext('key1', 'value1');
    setScreenshotContext('key2', 'value2');

    expect(getScreenshotContext('key1')).toBe('value1');
  });
});
