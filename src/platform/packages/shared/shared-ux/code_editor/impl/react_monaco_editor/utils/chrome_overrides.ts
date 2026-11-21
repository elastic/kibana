/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { UseEuiTheme } from '@elastic/eui';
import type { KbnCodeEditorThemeColorId } from '@kbn/monaco';

/**
 * A Monaco color id (`editor.background`, `editorSuggestWidget.selectedBackground`, …), or a raw
 * `--vscode-*` custom property for the handful Monaco exposes that are not colors
 * (`--vscode-cornerRadius-large`, `--vscode-shadow-lg`). The ids Kibana's default chrome sets are
 * offered for completion; any other Monaco color id is accepted.
 */
export type KbnCodeEditorChromeColorId =
  | KbnCodeEditorThemeColorId
  | `${string}.${string}`
  | `--vscode-${string}`;

export type KbnCodeEditorChromeColors = Partial<Record<KbnCodeEditorChromeColorId, string>>;

/**
 * Chrome colors for one editor instance, derived from the current EUI theme so they follow light,
 * dark and high-contrast switches. Values are CSS color strings, so `transparent` and EUI tokens
 * are both fine. Declare it once at module scope: a new function per render re-applies on every
 * render.
 */
export type KbnCodeEditorChromeOverrides = (theme: UseEuiTheme) => KbnCodeEditorChromeColors;

/**
 * Elements inside an editor root that Monaco's global color rule targets directly — their own
 * declaration would otherwise beat the value inherited from the root.
 * @see {@link https://github.com/microsoft/vscode/blob/9ed1adf18f4e746adad3e6ed3264cca607e1bbb8/src/vs/editor/standalone/browser/standaloneThemeService.ts#L402 | Monaco's theme service implementation}
 */
const MONACO_CHROME_NODE_SELECTOR = '.monaco-editor, .monaco-diff-editor, .monaco-component';

/**
 * Monaco's own mapping from color id to custom property
 * ({@link https://github.com/microsoft/vscode/blob/main/src/vs/platform/theme/common/colorUtils.ts#L35-L37 | `asCssVariableName`}).
 * Raw `--vscode-*` names pass through.
 */
export const toMonacoCssVariableName = (colorId: string): string =>
  colorId.startsWith('--') ? colorId : `--vscode-${colorId.replace(/\./g, '-')}`;

/**
 * Resolves overrides against the EUI theme into the custom properties to set, keyed by property
 * name. Entries without a value are dropped so a conditional override can be expressed as
 * `() => ({ 'editor.background': isTransparent ? 'transparent' : undefined })`.
 */
export const resolveKbnCodeEditorChromeOverrides = (
  overrides: KbnCodeEditorChromeOverrides,
  theme: UseEuiTheme
): Record<string, string> => {
  return Object.entries(overrides(theme)).reduce<Record<string, string>>(
    (properties, [colorId, value]) => {
      if (value !== undefined) {
        properties[toMonacoCssVariableName(colorId)] = value;
      }
      return properties;
    },
    {}
  );
};

export interface KbnCodeEditorChromeOverridesHandle {
  /** Removes every property this application set, leaving the nodes as they were. */
  dispose(): void;
}

/**
 * Applies chrome overrides to the given editor nodes, and to any Monaco-themed descendants, as
 * inline CSS custom properties.
 *
 * Applications don't stack: dispose the previous one before applying the next, which is what a
 * React effect's cleanup order gives you for free. For `CodeEditor` this is wired up by the
 * `chromeOverrides` prop; call it directly only for editors created with `monaco.editor.create*`.
 */
export const applyKbnCodeEditorChromeOverrides = (
  nodes: Array<HTMLElement | null | undefined>,
  overrides: KbnCodeEditorChromeOverrides,
  theme: UseEuiTheme
): KbnCodeEditorChromeOverridesHandle => {
  const properties = resolveKbnCodeEditorChromeOverrides(overrides, theme);
  const propertyNames = Object.keys(properties);
  const targets = new Set<HTMLElement>();

  for (const node of nodes) {
    if (!node) {
      continue;
    }

    targets.add(node);
    node.querySelectorAll<HTMLElement>(MONACO_CHROME_NODE_SELECTOR).forEach((descendant) => {
      targets.add(descendant);
    });
  }

  targets.forEach((target) => {
    propertyNames.forEach((name) => {
      target.style.setProperty(name, properties[name]);
    });
  });

  return {
    dispose: () => {
      targets.forEach((target) => {
        propertyNames.forEach((name) => {
          target.style.removeProperty(name);
        });
      });
      targets.clear();
    },
  };
};
