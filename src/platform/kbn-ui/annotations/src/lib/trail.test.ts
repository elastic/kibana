/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { IGNORE_ATTR } from '../constants';
import type { AnnotationsLocationService } from '../types';
import { createTrailRecorder, isTrailControl, type TrailRecorder } from './trail';

const render = (html: string) => {
  const parsed = new DOMParser().parseFromString(html, 'text/html');
  document.body.replaceChildren(...Array.from(parsed.body.childNodes));
};

const query = (selector: string): HTMLElement => {
  const element = document.querySelector<HTMLElement>(selector);
  if (!element) {
    throw new Error(`No element matches ${selector}`);
  }
  return element;
};

const createLocation = () => {
  const listeners = new Set<() => void>();
  let pageKey = '/app/one';
  const location: AnnotationsLocationService = {
    getPageKey: () => pageKey,
    getPath: () => pageKey,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
  return {
    location,
    navigate(next: string) {
      pageKey = next;
      listeners.forEach((listener) => listener());
    },
  };
};

describe('trail', () => {
  let recording = true;
  let recorder: TrailRecorder;
  const { location, navigate } = createLocation();

  beforeEach(() => {
    recording = true;
    recorder = createTrailRecorder({
      location,
      ignoreSelectors: ['#host'],
      isRecording: () => recording,
    });
    recorder.start();
  });

  afterEach(() => recorder.stop());

  const labels = () => recorder.steps().map(({ label }) => label);

  it('tells disclosure controls from form and selection controls', () => {
    render(`
      <a href="/x">link</a>
      <button type="button" aria-expanded="false">Open</button>
      <button type="submit">Save</button>
      <form><button>Implicit submit</button></form>
      <button type="button" role="switch">Dark</button>
      <input type="checkbox" />
      <div role="tab">Tab</div>
      <div role="option">Option</div>
    `);

    expect(isTrailControl(query('a'))).toBe(true);
    expect(isTrailControl(query('[aria-expanded]'))).toBe(true);
    expect(isTrailControl(query('[role="tab"]'))).toBe(true);
    expect(isTrailControl(query('[type="submit"]'))).toBe(false);
    expect(isTrailControl(query('form button'))).toBe(false);
    expect(isTrailControl(query('[role="switch"]'))).toBe(false);
    expect(isTrailControl(query('input'))).toBe(false);
    expect(isTrailControl(query('[role="option"]'))).toBe(false);
  });

  it('records a control once the page has handled the click, from the state before it', () => {
    render(`<button type="button" data-test-subj="details"><span>Show details</span></button>`);
    const button = query('button');
    button.addEventListener('click', () => {
      button.textContent = 'Hide details';
    });

    query('span').click();

    expect(recorder.steps()).toEqual([
      expect.objectContaining({
        label: 'Show details',
        anchor: expect.objectContaining({
          locators: expect.arrayContaining([{ type: 'testSubj', path: 'details' }]),
        }),
      }),
    ]);
  });

  it('skips clicks the page swallowed, clicks that removed the control, and clicks on excluded UI', () => {
    render(`
      <button type="button" id="swallowed">Swallowed</button>
      <button type="button" id="closing">Close</button>
      <div id="host"><button type="button">Host action</button></div>
      <div ${IGNORE_ATTR}="true"><button type="button">Layer action</button></div>
    `);
    query('#swallowed').addEventListener('click', (event) => event.stopPropagation());
    query('#closing').addEventListener('click', (event) => (event.target as Element).remove());

    query('#swallowed').click();
    query('#closing').click();
    query('#host button').click();
    query(`[${IGNORE_ATTR}] button`).click();

    expect(recorder.steps()).toEqual([]);
  });

  it('records nothing while not recording and forgets the steps on page change', () => {
    render(`<button type="button">First</button><a href="#second">Second</a>`);

    recording = false;
    query('button').click();
    recording = true;
    query('a').click();
    expect(labels()).toEqual(['Second']);

    navigate('/app/two');
    expect(labels()).toEqual([]);
  });

  it('listens once no matter how often it is started', () => {
    render(`<button type="button">Once</button>`);

    recorder.start();
    recorder.start();
    query('button').click();

    expect(labels()).toEqual(['Once']);
  });
});
