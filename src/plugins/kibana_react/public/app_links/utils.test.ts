/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
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
