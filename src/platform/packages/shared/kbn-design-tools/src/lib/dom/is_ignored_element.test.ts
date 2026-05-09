/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isIgnoredElement } from './is_ignored_element';
import {
  DEVELOPER_TOOLBAR_ID,
  MEASURE_OVERLAY_ID,
  MOVE_OVERLAY_ID,
  LAYOUT_OVERLAY_ID,
  LAYOUT_SETTINGS_FLYOUT_ID,
  DEVTOOL_IGNORE_ATTR,
} from '../constants';

describe('isIgnoredElement', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it.each([
    DEVELOPER_TOOLBAR_ID,
    MEASURE_OVERLAY_ID,
    MOVE_OVERLAY_ID,
    LAYOUT_OVERLAY_ID,
    LAYOUT_SETTINGS_FLYOUT_ID,
  ])('should ignore element with id "%s"', (id) => {
    const el = document.createElement('div');
    el.id = id;
    expect(isIgnoredElement(el)).toBe(true);
  });

  it('should ignore element with data-devtool-ignore attribute', () => {
    const el = document.createElement('div');
    el.setAttribute(DEVTOOL_IGNORE_ATTR, '');
    expect(isIgnoredElement(el)).toBe(true);
  });

  it('should ignore element inside an ignored container', () => {
    const container = document.createElement('div');
    container.id = DEVELOPER_TOOLBAR_ID;
    const child = document.createElement('button');
    container.appendChild(child);
    document.body.appendChild(container);

    expect(isIgnoredElement(child)).toBe(true);
  });

  it('should ignore element that contains an ignored container', () => {
    const wrapper = document.createElement('footer');
    const toolbar = document.createElement('div');
    toolbar.id = DEVELOPER_TOOLBAR_ID;
    wrapper.appendChild(toolbar);
    document.body.appendChild(wrapper);

    expect(isIgnoredElement(wrapper)).toBe(true);
  });

  it('should ignore element inside a data-devtool-ignore ancestor', () => {
    const container = document.createElement('div');
    container.setAttribute(DEVTOOL_IGNORE_ATTR, '');
    const child = document.createElement('span');
    container.appendChild(child);
    document.body.appendChild(container);

    expect(isIgnoredElement(child)).toBe(true);
  });

  it('should not ignore a regular element', () => {
    const el = document.createElement('div');
    document.body.appendChild(el);
    expect(isIgnoredElement(el)).toBe(false);
  });

  it('should not ignore an element with an unrelated id', () => {
    const el = document.createElement('div');
    el.id = 'myComponent';
    document.body.appendChild(el);
    expect(isIgnoredElement(el)).toBe(false);
  });

  it('should ignore an EuiSpacer element', () => {
    const el = document.createElement('div');
    el.className = 'css-1a2b3c-euiSpacer-m';
    document.body.appendChild(el);
    expect(isIgnoredElement(el)).toBe(true);
  });

  it('should not ignore an element with an unrelated class', () => {
    const el = document.createElement('div');
    el.className = 'css-1a2b3c-euiButton';
    document.body.appendChild(el);
    expect(isIgnoredElement(el)).toBe(false);
  });

  it.each(['kbnChromeLayoutFooter', 'kbnChromeLayoutHeader', 'kbnChromeLayoutSidebar'])(
    'should ignore element with class "%s"',
    (className) => {
      const el = document.createElement('div');
      el.className = className;
      document.body.appendChild(el);
      expect(isIgnoredElement(el)).toBe(true);
    }
  );
});
