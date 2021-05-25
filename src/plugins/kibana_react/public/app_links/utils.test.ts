/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { getClosestLink } from './utils';

const createBranch = (...tags: string[]): HTMLElement[] => {
  const elements: HTMLElement[] = [];
  let parent: HTMLElement | undefined;
  for (const tag of tags) {
    const element = document.createElement(tag);
    elements.push(element);
    if (parent) {
      parent.appendChild(element);
    }
    parent = element;
  }

  return elements;
};

describe('getClosestLink', () => {
  it(`returns the element itself if it's a link`, () => {
    const [target] = createBranch('A');
    expect(getClosestLink(target)).toBe(target);
  });

  it('returns the closest parent that is a link', () => {
    const [, , link, , target] = createBranch('A', 'DIV', 'A', 'DIV', 'SPAN');
    expect(getClosestLink(target)).toBe(link);
  });

  it('returns undefined if the closest link is further than the container', () => {
    const [, container, target] = createBranch('A', 'DIV', 'SPAN');
    expect(getClosestLink(target, container)).toBe(undefined);
  });
});
