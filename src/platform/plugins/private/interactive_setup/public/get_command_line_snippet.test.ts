/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

describe('getCommandLineSnippet', () => {
  const originalNavigator = window.navigator;

  afterEach(() => {
    jest.resetModules();
  });

  it('should format windows correctly', async () => {
    Object.defineProperty(window, 'navigator', {
      value: { userAgent: 'Windows' },
      writable: true,
    });
    const { getCommandLineSnippet } = await import('./get_command_line_snippet');
    expect(getCommandLineSnippet('kibana')).toEqual('bin\\kibana.bat');
    expect(getCommandLineSnippet('kibana', '--silent')).toEqual('bin\\kibana.bat --silent');
  });

  it('should format unix correctly', async () => {
    Object.defineProperty(window, 'navigator', {
      value: { userAgent: 'Linux' },
      writable: true,
    });
    const { getCommandLineSnippet } = await import('./get_command_line_snippet');
    expect(getCommandLineSnippet('kibana')).toEqual('bin/kibana');
    expect(getCommandLineSnippet('kibana', '--silent')).toEqual('bin/kibana --silent');
  });

  afterAll(function () {
    Object.defineProperty(window, 'navigator', {
      value: originalNavigator,
      writable: true,
    });
  });
});
