/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { renderTemplate } from './render_template';

function mockParams() {
  return {
    themeTag: 'v8light',
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
});
