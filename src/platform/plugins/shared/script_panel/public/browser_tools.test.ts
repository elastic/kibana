/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createScriptPanelBrowserTools } from './browser_tools';

describe('Script Panel Browser Tools', () => {
  let getCode: jest.Mock;
  let setCode: jest.Mock;
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    getCode = jest.fn().mockReturnValue('// existing code');
    setCode = jest.fn();
    consoleSpy = jest.spyOn(console, 'log').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('createScriptPanelBrowserTools', () => {
    it('should return three tools', () => {
      const tools = createScriptPanelBrowserTools({ getCode, setCode });

      expect(tools).toHaveLength(3);
    });

    it('should return tools with correct IDs', () => {
      const tools = createScriptPanelBrowserTools({ getCode, setCode });
      const toolIds = tools.map((t) => t.id);

      expect(toolIds).toContain('script_panel_get_code');
      expect(toolIds).toContain('script_panel_update_code');
      expect(toolIds).toContain('script_panel_append_code');
    });

    it('should have descriptions for all tools', () => {
      const tools = createScriptPanelBrowserTools({ getCode, setCode });

      tools.forEach((tool) => {
        expect(tool.description).toBeDefined();
        expect(tool.description.length).toBeGreaterThan(0);
      });
    });

    it('should have schemas for all tools', () => {
      const tools = createScriptPanelBrowserTools({ getCode, setCode });

      tools.forEach((tool) => {
        expect(tool.schema).toBeDefined();
      });
    });
  });

  describe('script_panel_get_code tool', () => {
    it('should call getCode when handler is invoked', () => {
      const tools = createScriptPanelBrowserTools({ getCode, setCode });
      const getTool = tools.find((t) => t.id === 'script_panel_get_code');

      // get_code tool accepts empty object params
      (getTool?.handler as (params: Record<string, never>) => void)({});

      expect(getCode).toHaveBeenCalled();
    });

    it('should log the code length', () => {
      getCode.mockReturnValue('console.log("hello");');
      const tools = createScriptPanelBrowserTools({ getCode, setCode });
      const getTool = tools.find((t) => t.id === 'script_panel_get_code');

      (getTool?.handler as (params: Record<string, never>) => void)({});

      expect(consoleSpy).toHaveBeenCalledWith(
        '[Script Panel] Current code retrieved:',
        21,
        'characters'
      );
    });

    it('should handle empty code', () => {
      getCode.mockReturnValue('');
      const tools = createScriptPanelBrowserTools({ getCode, setCode });
      const getTool = tools.find((t) => t.id === 'script_panel_get_code');

      (getTool?.handler as (params: Record<string, never>) => void)({});

      expect(consoleSpy).toHaveBeenCalledWith(
        '[Script Panel] Current code retrieved:',
        0,
        'characters'
      );
    });
  });

  describe('script_panel_update_code tool', () => {
    it('should call setCode with the provided code', () => {
      const tools = createScriptPanelBrowserTools({ getCode, setCode });
      const updateTool = tools.find((t) => t.id === 'script_panel_update_code');
      const newCode = 'Kibana.render.setContent("<h1>Updated</h1>");';

      updateTool?.handler({ code: newCode });

      expect(setCode).toHaveBeenCalledWith(newCode);
    });

    it('should log the updated code length', () => {
      const tools = createScriptPanelBrowserTools({ getCode, setCode });
      const updateTool = tools.find((t) => t.id === 'script_panel_update_code');
      const newCode = 'short code';

      updateTool?.handler({ code: newCode });

      expect(consoleSpy).toHaveBeenCalledWith('[Script Panel] Code updated:', 10, 'characters');
    });

    it('should replace existing code entirely', () => {
      getCode.mockReturnValue('// old code that should be replaced');
      const tools = createScriptPanelBrowserTools({ getCode, setCode });
      const updateTool = tools.find((t) => t.id === 'script_panel_update_code');
      const newCode = '// completely new code';

      updateTool?.handler({ code: newCode });

      // setCode should be called with just the new code, not appended
      expect(setCode).toHaveBeenCalledWith(newCode);
    });

    it('should have description mentioning Kibana runtime API', () => {
      const tools = createScriptPanelBrowserTools({ getCode, setCode });
      const updateTool = tools.find((t) => t.id === 'script_panel_update_code');

      expect(updateTool?.description).toContain('Kibana.esql.query');
      expect(updateTool?.description).toContain('Kibana.panel.getSize');
      expect(updateTool?.description).toContain('Kibana.render.setContent');
    });
  });

  describe('script_panel_append_code tool', () => {
    it('should append code to existing code', () => {
      getCode.mockReturnValue('// first line');
      const tools = createScriptPanelBrowserTools({ getCode, setCode });
      const appendTool = tools.find((t) => t.id === 'script_panel_append_code');
      const additionalCode = '// second line';

      appendTool?.handler({ code: additionalCode });

      expect(setCode).toHaveBeenCalledWith('// first line\n\n// second line');
    });

    it('should handle empty existing code', () => {
      getCode.mockReturnValue('');
      const tools = createScriptPanelBrowserTools({ getCode, setCode });
      const appendTool = tools.find((t) => t.id === 'script_panel_append_code');
      const newCode = '// new code';

      appendTool?.handler({ code: newCode });

      // When existing is empty, should just set the new code
      expect(setCode).toHaveBeenCalledWith('// new code');
    });

    it('should log the appended code length', () => {
      getCode.mockReturnValue('existing');
      const tools = createScriptPanelBrowserTools({ getCode, setCode });
      const appendTool = tools.find((t) => t.id === 'script_panel_append_code');

      appendTool?.handler({ code: '12345' });

      expect(consoleSpy).toHaveBeenCalledWith('[Script Panel] Code appended:', 5, 'characters');
    });

    it('should add double newline separator between existing and new code', () => {
      getCode.mockReturnValue('const a = 1;');
      const tools = createScriptPanelBrowserTools({ getCode, setCode });
      const appendTool = tools.find((t) => t.id === 'script_panel_append_code');

      appendTool?.handler({ code: 'const b = 2;' });

      expect(setCode).toHaveBeenCalledWith('const a = 1;\n\nconst b = 2;');
    });
  });

  describe('tool schema validation', () => {
    it('script_panel_get_code should have empty schema', () => {
      const tools = createScriptPanelBrowserTools({ getCode, setCode });
      const getTool = tools.find((t) => t.id === 'script_panel_get_code');

      // Empty schema should parse empty object
      const result = getTool?.schema.safeParse({});
      expect(result?.success).toBe(true);
    });

    it('script_panel_update_code should require code parameter', () => {
      const tools = createScriptPanelBrowserTools({ getCode, setCode });
      const updateTool = tools.find((t) => t.id === 'script_panel_update_code');

      // Missing code should fail
      const resultMissing = updateTool?.schema.safeParse({});
      expect(resultMissing?.success).toBe(false);

      // With code should pass
      const resultWithCode = updateTool?.schema.safeParse({ code: 'test' });
      expect(resultWithCode?.success).toBe(true);
    });

    it('script_panel_append_code should require code parameter', () => {
      const tools = createScriptPanelBrowserTools({ getCode, setCode });
      const appendTool = tools.find((t) => t.id === 'script_panel_append_code');

      // Missing code should fail
      const resultMissing = appendTool?.schema.safeParse({});
      expect(resultMissing?.success).toBe(false);

      // With code should pass
      const resultWithCode = appendTool?.schema.safeParse({ code: 'test' });
      expect(resultWithCode?.success).toBe(true);
    });
  });
});
