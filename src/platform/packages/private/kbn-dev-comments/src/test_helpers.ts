/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createInMemoryCommentsApi } from './lib/in_memory_api';
import type {
  Comment,
  CommentsHostServices,
  CommentsLocationService,
  ElementAnchor,
} from './types';

const DEFAULT_RECT = '10,10,100,20';

/** An element's box from its `data-rect="x,y,width,height"` attribute, or `DEFAULT_RECT`. */
const rectOf = (element: Element): DOMRect => {
  const [x, y, width, height] = (element.getAttribute('data-rect') ?? DEFAULT_RECT)
    .split(',')
    .map(Number);
  return { x, y, width, height, left: x, top: y, right: x + width, bottom: y + height } as DOMRect;
};

/**
 * jsdom has no layout. For the enclosing `describe`, gives every element a box
 * (see `rectOf`), so that anchors resolve and pins are on screen, a
 * `scrollIntoView`, and hit testing that finds nothing covering any element.
 * Elements are hidden with `data-rect="0,0,0,0"`.
 */
export const mockLayout = () => {
  beforeAll(() => {
    jest
      .spyOn(Element.prototype, 'getBoundingClientRect')
      .mockImplementation(function getBoundingClientRect(this: Element) {
        return rectOf(this);
      });
    Element.prototype.scrollIntoView = jest.fn();
    Document.prototype.elementFromPoint = () => null;
  });
  afterAll(() => {
    jest.restoreAllMocks();
  });
};

export const renderPage = (html: string) => {
  const parsed = new DOMParser().parseFromString(html, 'text/html');
  document.body.replaceChildren(...Array.from(parsed.body.childNodes));
};

export const query = <E extends Element = HTMLElement>(selector: string): E => {
  const element = document.querySelector<E>(selector);
  if (!element) {
    throw new Error(`No element matches ${selector}`);
  }
  return element;
};

/** The text of the comment editor (`CommentEditor`) with the given test subject. */
export const editorText = (testSubj: string): HTMLTextAreaElement =>
  query<HTMLTextAreaElement>(`[data-test-subj="${testSubj}"] textarea`);

/** Lets settled promises and zero-delay timers run; wrap in `act` where React renders. */
export const flush = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

export const deferred = <T>() => {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

/** An anchor on the element with `id`, pinned at its center. */
export const anchorById = (id: string): ElementAnchor => ({
  locators: [{ type: 'id', value: id }],
  relativeX: 0.5,
  relativeY: 0.5,
});

/** A stored comment on `#target` of the page `/page`. */
export const createComment = (id: string, overrides: Partial<Comment> = {}): Comment => ({
  id,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  author: { username: 'capybara', displayName: 'Capybara' },
  text: `Comment ${id}`,
  resolved: false,
  replies: [],
  route: { pageKey: '/page', path: '/page' },
  anchor: anchorById('target'),
  trail: [],
  ...overrides,
});

/** A location the test navigates; the page key is the path without query and hash. */
export const createLocation = (initialPath = '/page') => {
  const listeners = new Set<() => void>();
  let path = initialPath;
  const location: CommentsLocationService = {
    getPageKey: () => path.split(/[?#]/)[0],
    getPath: () => path,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
  const navigate = (next: string) => {
    path = next;
    listeners.forEach((listener) => listener());
  };
  return { location, navigate };
};

/** Host services for the page `/page`: an empty in-memory API, no-op navigation */
export const createHostServices = (
  overrides: Partial<CommentsHostServices> = {}
): CommentsHostServices => ({
  api: createInMemoryCommentsApi(),
  location: createLocation().location,
  navigateToPath: async () => {},
  getCurrentUser: async () => ({ username: 'capybara', fullName: 'Capybara' }),
  ...overrides,
});
