/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { UseEuiTheme } from '@elastic/eui';
import { getCodeActionWidgetStyles } from './get_code_action_widget_styles';

const createMockEuiThemeContext = (): UseEuiTheme =>
  ({
    euiTheme: {
      colors: {
        textParagraph: '#343741',
      } as any,
      size: {
        s: '8px',
        base: '16px',
      } as any,
      border: {
        radius: {
          medium: '6px',
        },
      } as any,
      shadows: {
        m: {
          down: '0 4px 8px rgba(0, 0, 0, 0.1)',
        },
      } as any,
      flags: {
        shadowVariant: 'legacy',
      } as any,
    } as any,
    colorMode: 'LIGHT' as const,
    modifications: {},
    highContrastMode: false,
  } as UseEuiTheme);

describe('getCodeActionWidgetStyles', () => {
  const stylesString = getCodeActionWidgetStyles(createMockEuiThemeContext()).styles;

  it('rounds the corners of the code action widget like the hover widgets', () => {
    expect(stylesString).toContain('.action-widget');
    expect(stylesString).toContain('border-radius:6px!important');
    expect(stylesString).toContain('overflow:hidden!important');
  });

  it('masks the "Fix with AI Agent" row icon with the agent icon', () => {
    expect(stylesString).toContain('.monaco-list-row[aria-label="Fix with AI Agent"] .codicon');
    expect(stylesString).toContain('mask-image:url(');
    expect(stylesString).toContain('width:16px');
    expect(stylesString).toContain('content:none');
  });

  it('leaves the icon of other quick fix rows alone', () => {
    expect(stylesString).not.toContain('.monaco-list-row .codicon');
  });
});
