/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { buildScreenContextDescription } from './use_agent_builder';
import type { RuntimeState } from '@kbn/script-panel/public';

describe('buildScreenContextDescription', () => {
  const defaultOptions = {
    name: 'Test App',
    scriptCode: 'const x = 1;',
    runtimeState: 'idle' as RuntimeState,
    runtimeError: null,
  };

  it('includes the app name', () => {
    const description = buildScreenContextDescription(defaultOptions);
    expect(description).toContain('Test App');
  });

  it('includes the current code in a code block', () => {
    const description = buildScreenContextDescription(defaultOptions);
    expect(description).toContain('CURRENT CODE:');
    expect(description).toContain('```');
    expect(description).toContain('const x = 1;');
  });

  it('indicates when there is no code', () => {
    const description = buildScreenContextDescription({
      ...defaultOptions,
      scriptCode: '',
    });
    expect(description).toContain('The mini app has no code yet');
  });

  it('includes runtime state when not idle', () => {
    const description = buildScreenContextDescription({
      ...defaultOptions,
      runtimeState: 'running',
    });
    expect(description).toContain('CURRENT STATE: running');
  });

  it('includes runtime error when present', () => {
    const description = buildScreenContextDescription({
      ...defaultOptions,
      runtimeError: 'SyntaxError: Unexpected token',
    });
    expect(description).toContain('RUNTIME ERROR: SyntaxError: Unexpected token');
  });

  it('documents the available tools', () => {
    const description = buildScreenContextDescription(defaultOptions);
    expect(description).toContain('mini_app_get_code');
    expect(description).toContain('mini_app_str_replace');
    expect(description).toContain('mini_app_insert_at_line');
    expect(description).toContain('mini_app_append_code');
    expect(description).toContain('mini_app_update_code');
  });

  it('includes the preferred workflow guidance', () => {
    const description = buildScreenContextDescription(defaultOptions);
    expect(description).toContain('WORKFLOW FOR EDITS');
    expect(description).toContain('prefer targeted edits over full rewrites');
  });

  it('includes the Kibana API documentation', () => {
    const description = buildScreenContextDescription(defaultOptions);
    expect(description).toContain('Kibana.esql.query');
    expect(description).toContain('Kibana.render.setContent');
    expect(description).toContain('Kibana.navigate');
  });

  it('includes Preact/htm documentation', () => {
    const description = buildScreenContextDescription(defaultOptions);
    expect(description).toContain('preact');
    expect(description).toContain('html');
    expect(description).toContain('useState');
    expect(description).toContain('useEffect');
  });
});

describe('agent builder tool handlers', () => {
  let codeRef: { current: string };
  let onUpdateCode: jest.Mock;

  beforeEach(() => {
    codeRef = { current: 'const x = 1;\nconst y = 2;\nconst z = 3;' };
    onUpdateCode = jest.fn((newCode: string) => {
      codeRef.current = newCode;
    });
  });

  describe('mini_app_get_code', () => {
    it('returns the current code', () => {
      const result = codeRef.current;
      expect(result).toBe('const x = 1;\nconst y = 2;\nconst z = 3;');
    });
  });

  describe('mini_app_str_replace', () => {
    const strReplaceHandler = (params: {
      old_string: string;
      new_string: string;
      replace_all?: boolean;
    }) => {
      const existing = codeRef.current;
      if (!existing.includes(params.old_string)) {
        return { success: false, error: 'old_string not found in code' };
      }
      const updated = params.replace_all
        ? existing.split(params.old_string).join(params.new_string)
        : existing.replace(params.old_string, params.new_string);
      onUpdateCode(updated);
      return { success: true };
    };

    it('replaces first occurrence by default', () => {
      const result = strReplaceHandler({
        old_string: 'const',
        new_string: 'let',
      });

      expect(result).toEqual({ success: true });
      expect(codeRef.current).toBe('let x = 1;\nconst y = 2;\nconst z = 3;');
    });

    it('replaces all occurrences when replace_all is true', () => {
      const result = strReplaceHandler({
        old_string: 'const',
        new_string: 'let',
        replace_all: true,
      });

      expect(result).toEqual({ success: true });
      expect(codeRef.current).toBe('let x = 1;\nlet y = 2;\nlet z = 3;');
    });

    it('returns error when old_string is not found', () => {
      const result = strReplaceHandler({
        old_string: 'notfound',
        new_string: 'replacement',
      });

      expect(result).toEqual({ success: false, error: 'old_string not found in code' });
      expect(onUpdateCode).not.toHaveBeenCalled();
    });

    it('can delete text by using empty new_string', () => {
      const result = strReplaceHandler({
        old_string: '\nconst y = 2;',
        new_string: '',
      });

      expect(result).toEqual({ success: true });
      expect(codeRef.current).toBe('const x = 1;\nconst z = 3;');
    });
  });

  describe('mini_app_insert_at_line', () => {
    const insertAtLineHandler = (params: { line: number; code: string }) => {
      const existing = codeRef.current;
      const lines = existing.split('\n');
      const insertIndex = Math.max(0, Math.min(params.line - 1, lines.length));
      lines.splice(insertIndex, 0, params.code);
      const updated = lines.join('\n');
      onUpdateCode(updated);
      return { success: true, inserted_at_line: insertIndex + 1 };
    };

    it('inserts code at the specified line', () => {
      const result = insertAtLineHandler({
        line: 2,
        code: 'const a = 0;',
      });

      expect(result).toEqual({ success: true, inserted_at_line: 2 });
      expect(codeRef.current).toBe('const x = 1;\nconst a = 0;\nconst y = 2;\nconst z = 3;');
    });

    it('inserts at the beginning when line is 1', () => {
      const result = insertAtLineHandler({
        line: 1,
        code: '// header',
      });

      expect(result).toEqual({ success: true, inserted_at_line: 1 });
      expect(codeRef.current).toBe('// header\nconst x = 1;\nconst y = 2;\nconst z = 3;');
    });

    it('inserts at the end when line exceeds line count', () => {
      const result = insertAtLineHandler({
        line: 100,
        code: '// footer',
      });

      expect(result).toEqual({ success: true, inserted_at_line: 4 });
      expect(codeRef.current).toBe('const x = 1;\nconst y = 2;\nconst z = 3;\n// footer');
    });

    it('clamps negative line numbers to 1', () => {
      const result = insertAtLineHandler({
        line: -5,
        code: '// top',
      });

      expect(result).toEqual({ success: true, inserted_at_line: 1 });
      expect(codeRef.current).toBe('// top\nconst x = 1;\nconst y = 2;\nconst z = 3;');
    });
  });

  describe('mini_app_append_code', () => {
    const appendCodeHandler = (params: { code: string }) => {
      const existing = codeRef.current;
      onUpdateCode(existing ? `${existing}\n\n${params.code}` : params.code);
    };

    it('appends code with two newlines', () => {
      appendCodeHandler({ code: 'const w = 4;' });

      expect(codeRef.current).toBe('const x = 1;\nconst y = 2;\nconst z = 3;\n\nconst w = 4;');
    });

    it('handles empty existing code', () => {
      codeRef.current = '';
      appendCodeHandler({ code: 'const first = 1;' });

      expect(codeRef.current).toBe('const first = 1;');
    });
  });

  describe('mini_app_update_code', () => {
    it('replaces all code', () => {
      onUpdateCode('// completely new code');

      expect(codeRef.current).toBe('// completely new code');
    });
  });
});
