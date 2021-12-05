/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { getCommandLineSnippet } from './get_command_line_snippet';

describe('getCommandLineSnippet', () => {
  const originalNavigator = window.navigator;

  it('should format windows correctly', () => {
    Object.defineProperty(window, 'navigator', {
      value: { userAgent: 'Windows' },
      writable: true,
    });
    expect(getCommandLineSnippet('kibana')).toEqual('bin\\kibana.bat');
    expect(getCommandLineSnippet('kibana', '--silent')).toEqual('bin\\kibana.bat --silent');
  });

  it('should format unix correctly', () => {
    Object.defineProperty(window, 'navigator', {
      value: { userAgent: 'Linux' },
      writable: true,
    });
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
