/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEuiTheme } from '@elastic/eui';
import type { EuiThemeComputed } from '@elastic/eui';
import React from 'react';
import { WORKFLOWS_MONACO_EDITOR_THEME } from '@kbn/workflows-ui';

/**
 * Monaco padding so the first/last lines are not flush to the editor chrome.
 */
export const flyoutMonacoContentPaddingPx = (euiTheme: EuiThemeComputed): number =>
  parseInt(String(euiTheme.size.base), 10) || 16;

/** Shared CodeEditor options for flyout YAML / schema editors. */
export const getFlyoutMonacoEditorOptions = (
  euiTheme: EuiThemeComputed,
  overrides: { readonly tabSize?: number } = {}
) => {
  const pad = flyoutMonacoContentPaddingPx(euiTheme);
  return {
    theme: WORKFLOWS_MONACO_EDITOR_THEME,
    automaticLayout: true,
    fontSize: 12,
    minimap: { enabled: false },
    lineNumbersMinChars: 3,
    scrollBeyondLastLine: false,
    tabSize: overrides.tabSize ?? 2,
    padding: { top: pad, bottom: pad },
  };
};

/**
 * Monaco frame for flyout code surfaces.
 *
 * - `bleed` — full-width YAML tab (edge-to-edge under the header; no radius).
 * - `inset` — bordered card for embedded editors (e.g. unsupported schema).
 */
export function FlyoutMonacoFrame({
  children,
  height = '100%',
  minHeight,
  variant = 'bleed',
  'data-test-subj': dataTestSubj,
}: {
  readonly children: React.ReactNode;
  readonly height?: string | number;
  readonly minHeight?: string | number;
  readonly variant?: 'bleed' | 'inset';
  readonly 'data-test-subj'?: string;
}) {
  const { euiTheme } = useEuiTheme();
  const isBleed = variant === 'bleed';
  return (
    <div
      data-test-subj={dataTestSubj}
      css={{
        height,
        minHeight,
        width: '100%',
        flex: isBleed ? '1 1 auto' : undefined,
        background: euiTheme.colors.backgroundBaseSubdued,
        ...(isBleed
          ? {
              borderRadius: 0,
              border: 'none',
            }
          : {
              border: `${euiTheme.border.width.thin} solid ${euiTheme.colors.borderBasePlain}`,
              borderRadius: euiTheme.border.radius.medium,
            }),
        overflow: 'hidden',
        boxSizing: 'border-box',
      }}
    >
      {children}
    </div>
  );
}
