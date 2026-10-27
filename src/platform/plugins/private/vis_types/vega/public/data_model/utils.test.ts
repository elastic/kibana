/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Utils } from './utils';

describe('Utils.formatErrorToStr', () => {
  it('uses the message of an Error', () => {
    expect(Utils.formatErrorToStr(new Error('Index "logs" not found'))).toBe(
      'Index "logs" not found'
    );
  });

  it('keeps a string error as is', () => {
    expect(Utils.formatErrorToStr('Invalid Vega specification')).toBe('Invalid Vega specification');
  });

  it('does not stringify other values', () => {
    const toJSON = jest.fn(() => 'leaked');

    expect(Utils.formatErrorToStr({ toJSON })).toBe('Error');
    expect(toJSON).not.toHaveBeenCalled();
  });
});
