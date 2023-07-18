/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { deduplicateToasts } from './deduplicate_toasts';
import { Toast } from '@kbn/core-notifications-browser';

const mockDismissToast = jest.fn();

function toast(title: string, text: string, id = Math.random()): Toast {
  return {
    id: id.toString(),
    title,
    text,
  };
}

describe('deduplicate toasts', () => {
  it('returns an empty list for an empty input', () => {
    const toasts: Toast[] = [];

    const deduplicatedToastList = deduplicateToasts(toasts, mockDismissToast);

    expect(deduplicatedToastList).toHaveLength(0);
  });

  it('groups toasts based on title + name', () => {
    const toasts: Toast[] = [
      toast('A', 'B'),
      toast('X', 'Y'),
      toast('A', 'B'),
      toast('A', 'C'),
      toast('A', 'C'),
      toast('X', 'Y'),
    ];

    const deduplicatedToastList = deduplicateToasts(toasts, mockDismissToast);

    expect(deduplicatedToastList).toHaveLength(3);
    expect(deduplicatedToastList[0].text).toBe('B');
    expect(deduplicatedToastList[1].text).toBe('Y');
    expect(deduplicatedToastList[2].text).toBe('C');
  });
});
