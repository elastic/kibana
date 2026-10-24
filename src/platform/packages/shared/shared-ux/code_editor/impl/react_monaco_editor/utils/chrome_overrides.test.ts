/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { UseEuiTheme } from '@elastic/eui';
import {
  applyKbnCodeEditorChromeOverrides,
  resolveKbnCodeEditorChromeOverrides,
  toMonacoCssVariableName,
  type KbnCodeEditorChromeColors,
  type KbnCodeEditorChromeOverrides,
} from './chrome_overrides';

const theme = {
  colorMode: 'LIGHT',
  euiTheme: { colors: { backgroundBasePlain: '#fafafa', textParagraph: '#101010' } },
} as unknown as UseEuiTheme;

const transparentBackground: KbnCodeEditorChromeOverrides = () => ({
  'editor.background': 'transparent',
});

/** A standalone editor root: Monaco gives it the class, nothing Monaco-themed is nested inside. */
const createEditorRoot = () => {
  const root = document.createElement('div');
  root.className = 'monaco-editor';
  root.innerHTML = '<div class="overflow-guard"><div class="view-lines"></div></div>';
  return root;
};

/** A diff editor root: two nested `.monaco-editor` roots that Monaco's global colour rule targets. */
const createDiffEditorRoot = () => {
  const root = document.createElement('div');
  root.className = 'monaco-diff-editor';
  root.innerHTML =
    '<div class="editor original monaco-editor"></div><div class="editor modified monaco-editor"></div>';
  return root;
};

/** The overflow-widgets container `@kbn/code-editor` portals to `body`. */
const createOverflowNode = () => {
  const node = document.createElement('div');
  node.className = 'monaco-editor monaco-editor-overflowing-widgets-container';
  return node;
};

const property = (el: HTMLElement, name: string) => el.style.getPropertyValue(name);

describe('KbnCodeEditorChromeColors', () => {
  it('accepts Kibana ids, any Monaco colour id, and raw --vscode-* properties; rejects the rest', () => {
    const accepted: KbnCodeEditorChromeColors = {
      'editor.background': 'transparent', // set by Kibana's default chrome
      'editorSuggestWidget.border': '#000', // any Monaco colour id
      '--vscode-cornerRadius-large': '6px', // raw property
    };
    // One literal per case: TypeScript reports only the first excess property of a literal.
    const notAColorId: KbnCodeEditorChromeColors = {
      // @ts-expect-error — Monaco colour ids are always `<group>.<name>`
      background: '#000',
    };
    const notAMonacoProperty: KbnCodeEditorChromeColors = {
      // @ts-expect-error — only `--vscode-*` properties are Monaco's
      '--my-var': '#000',
    };

    expect(accepted).toBeDefined();
    expect(notAColorId).toBeDefined();
    expect(notAMonacoProperty).toBeDefined();
  });
});

describe('toMonacoCssVariableName', () => {
  it('maps a colour id the way Monaco does', () => {
    expect(toMonacoCssVariableName('editor.background')).toBe('--vscode-editor-background');
    expect(toMonacoCssVariableName('editorSuggestWidget.selectedBackground')).toBe(
      '--vscode-editorSuggestWidget-selectedBackground'
    );
    expect(toMonacoCssVariableName('editorIndentGuide.background1')).toBe(
      '--vscode-editorIndentGuide-background1'
    );
  });

  it('passes raw custom properties through', () => {
    expect(toMonacoCssVariableName('--vscode-cornerRadius-large')).toBe(
      '--vscode-cornerRadius-large'
    );
  });
});

describe('resolveKbnCodeEditorChromeOverrides', () => {
  it('resolves colour ids and raw properties to custom properties', () => {
    expect(
      resolveKbnCodeEditorChromeOverrides(
        () => ({ 'editor.background': 'transparent', '--vscode-shadow-lg': 'none' }),
        theme
      )
    ).toEqual({ '--vscode-editor-background': 'transparent', '--vscode-shadow-lg': 'none' });
  });

  it('hands the overrides the EUI theme', () => {
    const overrides = jest.fn(({ euiTheme }: UseEuiTheme) => ({
      'editor.background': euiTheme.colors.backgroundBasePlain,
    }));

    expect(resolveKbnCodeEditorChromeOverrides(overrides, theme)).toEqual({
      '--vscode-editor-background': '#fafafa',
    });
    expect(overrides).toHaveBeenCalledWith(theme);
  });

  it('drops entries without a value, so overrides can be conditional', () => {
    expect(
      resolveKbnCodeEditorChromeOverrides(
        () => ({ 'editor.background': undefined, 'editor.foreground': '#000' }),
        theme
      )
    ).toEqual({ '--vscode-editor-foreground': '#000' });
  });
});

describe('applyKbnCodeEditorChromeOverrides', () => {
  it('sets the properties inline on every node given', () => {
    const root = createEditorRoot();
    const overflow = createOverflowNode();

    applyKbnCodeEditorChromeOverrides(
      [root, overflow],
      () => ({ 'editor.background': 'transparent', 'editorSuggestWidget.background': '#123456' }),
      theme
    );

    for (const node of [root, overflow]) {
      expect(property(node, '--vscode-editor-background')).toBe('transparent');
      expect(property(node, '--vscode-editorSuggestWidget-background')).toBe('#123456');
    }
  });

  it('leaves other editors alone', () => {
    const mine = createEditorRoot();
    const theirs = createEditorRoot();
    document.body.append(mine, theirs);

    applyKbnCodeEditorChromeOverrides([mine], transparentBackground, theme);

    expect(property(theirs, '--vscode-editor-background')).toBe('');
    expect(theirs.getAttribute('style')).toBeNull();

    mine.remove();
    theirs.remove();
  });

  it('reaches the nested roots of a diff editor, which the global rule would otherwise repaint', () => {
    const root = createDiffEditorRoot();

    applyKbnCodeEditorChromeOverrides([root], transparentBackground, theme);

    const nested = root.querySelectorAll<HTMLElement>('.monaco-editor');
    expect(nested).toHaveLength(2);
    nested.forEach((editor) => {
      expect(property(editor, '--vscode-editor-background')).toBe('transparent');
    });
  });

  it('does not touch descendants Monaco does not theme directly', () => {
    const root = createEditorRoot();

    applyKbnCodeEditorChromeOverrides([root], transparentBackground, theme);

    const viewLines = root.querySelector<HTMLElement>('.view-lines')!;
    expect(viewLines.getAttribute('style')).toBeNull();
  });

  it('tolerates nodes that are not mounted yet, and the same node given twice', () => {
    const root = createEditorRoot();

    expect(() =>
      applyKbnCodeEditorChromeOverrides([root, null, undefined, root], transparentBackground, theme)
    ).not.toThrow();
    expect(property(root, '--vscode-editor-background')).toBe('transparent');
  });

  it('preserves what Monaco itself writes to the root style', () => {
    const root = createEditorRoot();
    root.style.width = '640px';
    root.style.height = '80px';

    const handle = applyKbnCodeEditorChromeOverrides([root], transparentBackground, theme);

    expect(root.style.width).toBe('640px');
    expect(root.style.height).toBe('80px');

    handle.dispose();

    expect(root.style.width).toBe('640px');
    expect(root.style.height).toBe('80px');
  });

  it('dispose removes exactly the properties it set, on every node it set them on', () => {
    const root = createDiffEditorRoot();
    const overflow = createOverflowNode();
    overflow.style.setProperty('--vscode-editorHoverWidget-background', '#abcdef');

    const handle = applyKbnCodeEditorChromeOverrides(
      [root, overflow],
      () => ({ 'editor.background': 'transparent', 'editorSuggestWidget.background': '#123456' }),
      theme
    );
    handle.dispose();

    const touched = [root, overflow, ...root.querySelectorAll<HTMLElement>('.monaco-editor')];
    touched.forEach((node) => {
      expect(property(node, '--vscode-editor-background')).toBe('');
      expect(property(node, '--vscode-editorSuggestWidget-background')).toBe('');
    });
    // Set by someone else, for a different property: untouched.
    expect(property(overflow, '--vscode-editorHoverWidget-background')).toBe('#abcdef');
  });

  it('a new application after dispose replaces the previous one', () => {
    const root = createEditorRoot();

    const first = applyKbnCodeEditorChromeOverrides(
      [root],
      () => ({ 'editor.background': '#111111', 'editor.foreground': '#eeeeee' }),
      theme
    );
    first.dispose();
    applyKbnCodeEditorChromeOverrides([root], () => ({ 'editor.background': '#222222' }), theme);

    expect(property(root, '--vscode-editor-background')).toBe('#222222');
    // Dropped from the new overrides, so it must not linger from the old ones.
    expect(property(root, '--vscode-editor-foreground')).toBe('');
  });

  it('re-resolves against the theme it is applied with', () => {
    const root = createEditorRoot();
    const overrides: KbnCodeEditorChromeOverrides = ({ euiTheme }) => ({
      'editor.background': euiTheme.colors.backgroundBasePlain,
    });
    const dark = {
      ...theme,
      colorMode: 'DARK',
      euiTheme: { colors: { backgroundBasePlain: '#0b0b0b' } },
    } as unknown as UseEuiTheme;

    const light = applyKbnCodeEditorChromeOverrides([root], overrides, theme);
    expect(property(root, '--vscode-editor-background')).toBe('#fafafa');

    light.dispose();
    applyKbnCodeEditorChromeOverrides([root], overrides, dark);
    expect(property(root, '--vscode-editor-background')).toBe('#0b0b0b');
  });
});
