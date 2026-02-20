/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createMiniAppBrowserTools, type MiniAppScreenState } from './use_browser_tools';

describe('createMiniAppBrowserTools', () => {
  let getCode: jest.Mock;
  let setCode: jest.Mock;
  let getScreenState: jest.Mock;

  const defaultScreenState: MiniAppScreenState = {
    renderedHtml: '<div>hello</div>',
    runtimeState: 'running',
    runtimeError: null,
    recentLogs: [],
    panelSize: { width: 800, height: 600 },
  };

  beforeEach(() => {
    getCode = jest.fn().mockReturnValue('// existing code');
    setCode = jest.fn();
    getScreenState = jest.fn().mockReturnValue(defaultScreenState);
  });

  it('creates three browser tools', () => {
    const tools = createMiniAppBrowserTools({ getCode, setCode, getScreenState });
    expect(tools).toHaveLength(3);
    expect(tools.map((t) => t.id)).toEqual([
      'mini_app_get_context',
      'mini_app_update_code',
      'mini_app_append_code',
    ]);
  });

  it('get_context tool calls getCode and getScreenState', () => {
    const tools = createMiniAppBrowserTools({ getCode, setCode, getScreenState });
    const getContextTool = tools.find((t) => t.id === 'mini_app_get_context')!;

    (getContextTool.handler as (params: Record<string, never>) => void)({});
    expect(getCode).toHaveBeenCalled();
    expect(getScreenState).toHaveBeenCalled();
  });

  it('update_code tool calls setCode with new code', () => {
    const tools = createMiniAppBrowserTools({ getCode, setCode, getScreenState });
    const updateCodeTool = tools.find((t) => t.id === 'mini_app_update_code')!;

    updateCodeTool.handler({ code: '// new code' });
    expect(setCode).toHaveBeenCalledWith('// new code');
  });

  it('update_code tool description contains API reference', () => {
    const tools = createMiniAppBrowserTools({ getCode, setCode, getScreenState });
    const updateCodeTool = tools.find((t) => t.id === 'mini_app_update_code')!;

    expect(updateCodeTool.description).toContain('Kibana.esql.query');
    expect(updateCodeTool.description).toContain('Kibana.render.setContent');
    expect(updateCodeTool.description).toContain('async IIFE');
  });

  it('append_code tool appends to existing code', () => {
    const tools = createMiniAppBrowserTools({ getCode, setCode, getScreenState });
    const appendCodeTool = tools.find((t) => t.id === 'mini_app_append_code')!;

    appendCodeTool.handler({ code: '// appended' });
    expect(getCode).toHaveBeenCalled();
    expect(setCode).toHaveBeenCalledWith('// existing code\n\n// appended');
  });

  it('append_code tool handles empty existing code', () => {
    getCode.mockReturnValue('');
    const tools = createMiniAppBrowserTools({ getCode, setCode, getScreenState });
    const appendCodeTool = tools.find((t) => t.id === 'mini_app_append_code')!;

    appendCodeTool.handler({ code: '// new code' });
    expect(setCode).toHaveBeenCalledWith('// new code');
  });
});
