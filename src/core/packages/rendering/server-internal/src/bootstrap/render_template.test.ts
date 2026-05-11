/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { renderTemplate } from './render_template';

function mockParams() {
  return {
    themeTagName: 'borealis',
    colorMode: 'light',
    jsDependencyPaths: ['/js-1', '/js-2'],
    styleSheetPaths: ['/style-1', '/style-2'],
    publicPathMap: '{"foo": "bar"}',
  };
}

describe('renderTemplate', () => {
  test('resolves to a string', async () => {
    const content = await renderTemplate(mockParams());
    expect(typeof content).toEqual('string');
  });

  test('interpolates templateData into string template', async () => {
    const content = await renderTemplate(mockParams());
    expect(content).toMatchSnapshot();
  });
  test('interpolates system color mode', async () => {
    const content = await renderTemplate({
      ...mockParams(),
      themeTagName: 'borealis',
      colorMode: 'system',
    });
    expect(content).toMatchSnapshot();
  });

  test('uses IIFE instead of window.onload when useRspack is true', async () => {
    const content = await renderTemplate({
      ...mockParams(),
      useRspack: true,
    });
    expect(content).not.toContain('window.onload = function');
    expect(content).toContain('(function () {');
    expect(content).toContain('})();');
    expect(content).toMatchSnapshot();
  });

  test('uses window.onload when useRspack is false (default)', async () => {
    const content = await renderTemplate(mockParams());
    expect(content).toContain('window.onload = function');
    expect(content).not.toContain('(function () {');
    expect(content).not.toContain('})();');
  });

  test('includes __REACT_DEVTOOLS_GLOBAL_HOOK__ stub when useHMR is true', async () => {
    const content = await renderTemplate({
      ...mockParams(),
      useHMR: true,
    });
    expect(content).toContain('__REACT_DEVTOOLS_GLOBAL_HOOK__');
    expect(content).toContain('supportsFiber: true');
    expect(content).toContain('inject: function');
  });

  test('does NOT include __REACT_DEVTOOLS_GLOBAL_HOOK__ stub when useHMR is false', async () => {
    const content = await renderTemplate({
      ...mockParams(),
      useHMR: false,
    });
    expect(content).not.toContain('__REACT_DEVTOOLS_GLOBAL_HOOK__');
  });

  test('does NOT include __REACT_DEVTOOLS_GLOBAL_HOOK__ stub by default', async () => {
    const content = await renderTemplate(mockParams());
    expect(content).not.toContain('__REACT_DEVTOOLS_GLOBAL_HOOK__');
  });

  test('includes __kbnHmrActive__ = true when useHMR is true', async () => {
    const content = await renderTemplate({
      ...mockParams(),
      useHMR: true,
    });
    expect(content).toContain('__kbnHmrActive__ = true');
  });

  test('does NOT include __kbnHmrActive__ when useHMR is false', async () => {
    const content = await renderTemplate({
      ...mockParams(),
      useHMR: false,
    });
    expect(content).not.toContain('__kbnHmrActive__');
  });
});
