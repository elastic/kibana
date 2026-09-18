/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { IGNORE_ATTR } from '@kbn/dev-comments';
import { captureViewport } from './capture_viewport';

// jsdom cannot paint; what matters is which nodes the capture keeps.
const mockToCanvas = jest.fn();
jest.mock('dom-to-image-more', () => ({ toCanvas: mockToCanvas }));

const query = (selector: string): Element => {
  const element = document.querySelector(selector);
  if (!element) {
    throw new Error(`No element matches ${selector}`);
  }
  return element;
};

describe('captureViewport', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <main id="page"><button type="button" id="save">Save</button></main>
      <div id="developerToolbar"><button type="button" id="toolbarButton">Comment mode</button></div>
      <div id="measureOverlay"></div>
      <div id="pins"><button type="button" id="pin">Pin</button></div>
    `;
    query('#pins').setAttribute(IGNORE_ATTR, 'true');
    mockToCanvas.mockReset().mockResolvedValue(document.createElement('canvas'));
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it("leaves the layer's own UI and the host's ignored UI out, keeping the page", async () => {
    await captureViewport(['#developerToolbar', '#measureOverlay']);

    expect(mockToCanvas).toHaveBeenCalledTimes(1);
    const [root, { filter }] = mockToCanvas.mock.calls[0];
    expect(root).toBe(document.body);

    expect(filter(query('#page'))).toBe(true);
    expect(filter(query('#save'))).toBe(true);
    expect(filter(query('#developerToolbar'))).toBe(false);
    expect(filter(query('#measureOverlay'))).toBe(false);
    expect(filter(query('#pins'))).toBe(false);
  });

  it("leaves out only the layer's own UI without host selectors", async () => {
    await captureViewport();

    const [, { filter }] = mockToCanvas.mock.calls[0];
    expect(filter(query('#developerToolbar'))).toBe(true);
    expect(filter(query('#pins'))).toBe(false);
  });
});
