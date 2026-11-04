/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { anchorById, mockLayout, query, renderPage } from '../test_helpers';
import { MISS_RETRY_MS, createAnchorResolver } from './anchor_resolver';

describe('anchor resolver', () => {
  mockLayout();

  /** Document-wide searches made by the resolver. */
  let searches: jest.SpyInstance;

  beforeEach(() => {
    searches = jest.spyOn(document, 'querySelectorAll');
  });

  afterEach(() => {
    searches.mockRestore();
  });

  it('keeps an element found while it is on the page and visible, and searches again once it is not', () => {
    renderPage(`<button id="save">Save</button>`);
    const resolver = createAnchorResolver();
    const anchors = [{ id: 'a', anchor: anchorById('save') }];

    const first = resolver.resolve(anchors, { tick: 1, now: 0 }).resolved.get('a');
    expect(first?.element).toBe(query('#save'));
    searches.mockClear();

    // Later layout ticks only check on the element.
    expect(resolver.resolve(anchors, { tick: 2, now: 16 }).resolved.get('a')).toBe(first);
    expect(searches).not.toHaveBeenCalled();

    // Hidden, it is searched for again and missed; re-rendered, its replacement is found.
    query('#save').setAttribute('data-rect', '0,0,0,0');
    expect(resolver.resolve(anchors, { tick: 3, now: 32 }).resolved.get('a')).toBeNull();
    renderPage(`<button id="save">Save</button>`);
    const replaced = resolver.resolve(anchors, { tick: 4, now: 1000 }).resolved.get('a');
    expect(replaced?.element).toBe(query('#save'));
    expect(replaced).not.toBe(first);
  });

  it('puts off searching again for an element it did not find until the layout changed and a moment passed', () => {
    renderPage(`<div id="host"></div>`);
    const resolver = createAnchorResolver();
    const anchors = [{ id: 'a', anchor: anchorById('late') }];

    expect(resolver.resolve(anchors, { tick: 1, now: 0 })).toEqual({
      resolved: new Map([['a', null]]),
      retryAt: undefined,
    });
    query('#host').innerHTML = '<button id="late">Late</button>';
    searches.mockClear();

    // The same tick (a render for another reason): nothing changed on the page.
    expect(resolver.resolve(anchors, { tick: 1, now: 10 }).resolved.get('a')).toBeNull();
    // The next tick, too soon after the search: put off, with the time to try again.
    expect(resolver.resolve(anchors, { tick: 2, now: 20 })).toEqual({
      resolved: new Map([['a', null]]),
      retryAt: MISS_RETRY_MS,
    });
    expect(searches).not.toHaveBeenCalled();

    // At that time the element is found, without another tick.
    const { resolved, retryAt } = resolver.resolve(anchors, { tick: 2, now: MISS_RETRY_MS });
    expect(resolved.get('a')?.element).toBe(query('#late'));
    expect(retryAt).toBeUndefined();
  });

  it('resolves changed anchors and new comments right away, and forgets comments it is no longer given', () => {
    renderPage(`<button id="one">One</button><button id="two">Two</button>`);
    const resolver = createAnchorResolver();
    const one = { id: 'a', anchor: anchorById('one') };

    resolver.resolve([one], { tick: 1, now: 0 });
    searches.mockClear();

    const { resolved } = resolver.resolve(
      [
        { ...one, anchor: anchorById('two') },
        { id: 'b', anchor: anchorById('two') },
      ],
      {
        tick: 1,
        now: 0,
      }
    );
    expect(resolved.get('a')?.element).toBe(query('#two'));
    expect(resolved.get('b')?.element).toBe(query('#two'));
    expect(searches).toHaveBeenCalledTimes(2);

    resolver.resolve([], { tick: 1, now: 0 });
    searches.mockClear();
    resolver.resolve([one], { tick: 1, now: 0 });
    expect(searches).toHaveBeenCalledTimes(1);
  });
});
