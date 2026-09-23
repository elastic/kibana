/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { IGNORE_ATTR } from '../constants';
import { createLocation, flush, mockLayout, query, renderPage } from '../test_helpers';
import { createTrailRecorder, isTrailControl, type TrailRecorder } from './trail';

describe('trail', () => {
  mockLayout();

  let recording = true;
  let recorder: TrailRecorder;
  const { location, navigate } = createLocation('/app/one');

  beforeEach(() => {
    recording = true;
    recorder = createTrailRecorder({
      location,
      ignoreSelectors: ['#host'],
      isRecording: () => recording,
    });
    recorder.start();
  });

  afterEach(() => {
    recorder.stop();
    jest.useRealTimers();
  });

  const labels = () => recorder.steps().map(({ label }) => label);

  /** The page's reaction to a click: the control expands, or a dialog opens. */
  const expandOnClick = (selector: string) => {
    const control = query(selector);
    control.addEventListener('click', () => control.setAttribute('aria-expanded', 'true'));
  };
  const openDialog = () => {
    const dialog = document.createElement('div');
    dialog.setAttribute('role', 'dialog');
    document.body.append(dialog);
  };

  it('tells disclosure controls from form and selection controls', () => {
    renderPage(`
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
    renderPage(
      `<button type="button" aria-expanded="false" data-test-subj="details"><span>Show details</span></button>`
    );
    const button = query('button');
    button.addEventListener('click', () => {
      button.setAttribute('aria-expanded', 'true');
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

  it('records only clicks that disclosed something, right away or once lazily loaded UI appears', () => {
    jest.useFakeTimers();
    renderPage(`
      <button type="button" id="flyout">Open flyout</button>
      <button type="button" id="acknowledge">Acknowledge</button>
      <button type="button" id="lazy">Open lazy flyout</button>
    `);
    query('#flyout').addEventListener('click', openDialog);
    query('#acknowledge').addEventListener('click', (event) => {
      (event.target as Element).textContent = 'Acknowledged';
    });
    query('#lazy').addEventListener('click', () => setTimeout(openDialog, 300));

    query('#flyout').click();
    query('#acknowledge').click();
    query('#lazy').click();
    expect(labels()).toEqual(['Open flyout']);

    jest.advanceTimersByTime(500);
    expect(labels()).toEqual(['Open flyout', 'Open lazy flyout']);
  });

  it('records a menu item whose submenu appears a frame later and takes the item away with its panel', async () => {
    jest.useFakeTimers();
    renderPage(`
      <div id="menu" role="menu"><button type="button" id="alerts">Create alert rule</button></div>
    `);
    // Like EUI's nested context menu: the submenu is shown on the next frame,
    // then the panel holding the clicked item slides out and is removed.
    query('#alerts').addEventListener('click', () => {
      requestAnimationFrame(() => {
        const submenu = document.createElement('div');
        submenu.setAttribute('role', 'menu');
        document.body.append(submenu);
        setTimeout(() => query('#menu').remove(), 250);
      });
    });

    query('#alerts').click();
    jest.advanceTimersByTime(20);
    // Lets the page change be observed.
    await Promise.resolve();
    jest.advanceTimersByTime(500);

    expect(labels()).toEqual(['Create alert rule']);
  });

  it('records a control that showed a dialog kept mounted while hidden, not one that left it hidden', () => {
    renderPage(`
      <button type="button" id="show">Show</button>
      <button type="button" id="noop">Nothing</button>
      <div role="dialog" data-rect="0,0,0,0">Kept in the DOM while hidden</div>
    `);
    const dialog = query('[role="dialog"]');
    query('#show').addEventListener('click', () => dialog.setAttribute('data-rect', '0,0,300,200'));

    query('#noop').click();
    expect(labels()).toEqual([]);

    query('#show').click();
    expect(labels()).toEqual(['Show']);
  });

  it('does not credit a click with what a later click disclosed', () => {
    jest.useFakeTimers();
    renderPage(`
      <button type="button" id="delete">Delete</button>
      <button type="button" id="flyout">Open flyout</button>
      <button type="button" id="acknowledge">Acknowledge</button>
      <div id="card">Card</div>
    `);
    query('#delete').addEventListener('click', (event) => {
      (event.target as Element).textContent = 'Deleted';
    });
    query('#flyout').addEventListener('click', openDialog);
    query('#acknowledge').addEventListener('click', (event) => {
      (event.target as Element).textContent = 'Acknowledged';
    });
    // Clickable, but not a control: it can disclose UI without ever being recorded itself.
    query('#card').addEventListener('click', openDialog);

    query('#delete').click();
    query('#flyout').click();
    expect(labels()).toEqual(['Open flyout']);

    query('#acknowledge').click();
    query('#card').click();
    jest.advanceTimersByTime(500);
    expect(labels()).toEqual(['Open flyout']);
  });

  it('skips clicks the page swallowed, clicks that removed the control, and clicks on excluded UI', () => {
    renderPage(`
      <button type="button" id="swallowed">Swallowed</button>
      <button type="button" id="closing">Close</button>
      <div id="host"><button type="button">Host action</button></div>
      <div ${IGNORE_ATTR}="true"><button type="button">Layer action</button></div>
    `);
    query('#swallowed').addEventListener('click', (event) => {
      event.stopPropagation();
      openDialog();
    });
    query('#closing').addEventListener('click', (event) => {
      (event.target as Element).remove();
      openDialog();
    });
    query('#host button').addEventListener('click', openDialog);
    query(`[${IGNORE_ATTR}] button`).addEventListener('click', openDialog);

    query('#swallowed').click();
    query('#closing').click();
    query('#host button').click();
    query(`[${IGNORE_ATTR}] button`).click();

    expect(recorder.steps()).toEqual([]);
  });

  it('records nothing while not recording and forgets the steps on page change', () => {
    renderPage(
      `<button type="button" id="first">First</button><button type="button" id="second">Second</button>`
    );
    expandOnClick('#first');
    expandOnClick('#second');

    recording = false;
    query('#first').click();
    recording = true;
    query('#second').click();
    expect(labels()).toEqual(['Second']);

    navigate('/app/two');
    expect(labels()).toEqual([]);
  });

  it('does not start the next page with the click that led there, even as its link stays, marked current', async () => {
    renderPage(`
      <button type="button" id="menu">Menu</button>
      <a href="/app/current" id="current">Current</a>
      <a href="/app/plain" id="plain">Plain</a>
    `);
    expandOnClick('#menu');
    // A navigation link's handler changes the page before the click bubbles up to the recorder.
    const navigateOnClick = (selector: string, to: string, current: boolean) => {
      const link = query(selector);
      link.addEventListener('click', (event) => {
        event.preventDefault();
        if (current) {
          link.setAttribute('aria-current', 'page');
        }
        navigate(to);
      });
    };
    navigateOnClick('#current', '/app/current', true);
    navigateOnClick('#plain', '/app/plain', false);

    query('#menu').click();
    expect(labels()).toEqual(['Menu']);
    query('#current').click();
    expect(labels()).toEqual([]);

    // Nor is what the next page shows the doing of a link that disclosed nothing itself.
    query('#plain').click();
    openDialog();
    await flush();
    expect(labels()).toEqual([]);
  });

  it('listens once no matter how often it is started', () => {
    renderPage(`<button type="button">Once</button>`);
    expandOnClick('button');

    recorder.start();
    recorder.start();
    query('button').click();

    expect(labels()).toEqual(['Once']);
  });
});
