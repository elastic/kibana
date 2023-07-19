/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { deduplicateToasts } from './deduplicate_toasts';
import { Toast } from '@kbn/core-notifications-browser';
import { render } from 'enzyme';
import { ReactElement, ReactNode } from 'react';

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

    const { toasts: deduplicatedToastList } = deduplicateToasts(toasts);

    expect(deduplicatedToastList).toHaveLength(0);
  });

  it("doesn't affect singular notifications", () => {
    const toasts: Toast[] = [
      toast('A', 'B'), // single toast
      toast('X', 'Y'), // single toast
    ];

    const { toasts: deduplicatedToastList } = deduplicateToasts(toasts);

    expect(deduplicatedToastList).toHaveLength(toasts.length);
    verifyTextAndTitle(deduplicatedToastList[0], 'A', 'B');
    verifyTextAndTitle(deduplicatedToastList[1], 'X', 'Y');
  });

  it('groups toasts based on title + name', () => {
    const toasts: Toast[] = [
      toast('A', 'B'), // 2 of these
      toast('X', 'Y'), // 3 of these
      toast('A', 'B'),
      toast('X', 'Y'),
      toast('A', 'C'), // 1 of these
      toast('X', 'Y'),
    ];

    const { toasts: deduplicatedToastList } = deduplicateToasts(toasts);

    expect(deduplicatedToastList).toHaveLength(3);
    verifyTextAndTitle(deduplicatedToastList[0], 'A 2', 'B');
    verifyTextAndTitle(deduplicatedToastList[1], 'X 3', 'Y');
    verifyTextAndTitle(deduplicatedToastList[2], 'A', 'C');
  });
});

function verifyTextAndTitle({ text, title }: Toast, expectedTitle: string, expectedText: string) {
  expect(getNodeText(title)).toBe(expectedTitle);
  expect(text).toBe(expectedText);
}

function getNodeText(node: ReactNode) {
  const rendered = render(node as ReactElement);
  return rendered.text();
}
