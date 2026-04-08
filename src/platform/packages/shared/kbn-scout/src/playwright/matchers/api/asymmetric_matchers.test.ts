/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { expect as apiExpect } from '.';

describe('custom asymmetric matchers', () => {
  describe('expect.toBeGreaterThan()', () => {
    it('matches numbers greater than threshold', () => {
      expect(() =>
        apiExpect({ count: 5 }).toMatchObject({ count: apiExpect.toBeGreaterThan(4) })
      ).not.toThrow();
      expect(() =>
        apiExpect({ count: 5 }).toMatchObject({ count: apiExpect.toBeGreaterThan(5) })
      ).toThrow();
    });
  });

  describe('expect.toBeLessThan()', () => {
    it('matches numbers less than threshold', () => {
      expect(() =>
        apiExpect({ count: 5 }).toMatchObject({ count: apiExpect.toBeLessThan(6) })
      ).not.toThrow();
      expect(() =>
        apiExpect({ count: 5 }).toMatchObject({ count: apiExpect.toBeLessThan(5) })
      ).toThrow();
    });
  });

  it('supports nesting and combining with Playwright matchers', () => {
    const response = {
      data: {
        id: 'abc-123',
        count: 5,
        items: [{ name: 'a', extra: 'ignored' }, { name: 'b' }],
      },
    };
    expect(() =>
      apiExpect(response).toMatchObject({
        data: {
          count: apiExpect.toBeGreaterThan(0),
          items: apiExpect.arrayContaining([apiExpect.objectContaining({ name: 'a' })]),
        },
      })
    ).not.toThrow();
  });
});
