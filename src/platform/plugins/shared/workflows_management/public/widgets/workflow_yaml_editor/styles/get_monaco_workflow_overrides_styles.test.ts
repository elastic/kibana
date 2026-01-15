/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { UseEuiTheme } from '@elastic/eui';
import { getMonacoWorkflowOverridesStyles } from './get_monaco_workflow_overrides_styles';

const createMockEuiThemeContext = (): UseEuiTheme => ({
  euiTheme: {
    colors: {
      primaryText: '#0077cc',
      primary: '#0077cc',
      textParagraph: '#343741',
      backgroundBaseSubdued: '#f5f7fa',
      borderBaseSubdued: '#d3dae6',
      textPrimary: '#343741',
      backgroundBasePlain: '#ffffff',
      backgroundBaseInteractiveSelect: '#e6f0f8',
      backgroundLightText: '#98a2b3',
      borderBaseDisabled: '#d3dae6',
    } as any,
    size: {
      s: '8px',
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
});

describe('getMonacoWorkflowOverridesStyles', () => {
  it('should apply shadow and border-radius to hover widget', () => {
    const euiThemeContext = createMockEuiThemeContext();
    const styles = getMonacoWorkflowOverridesStyles(euiThemeContext);

    expect(styles).toBeDefined();
    const stylesString = styles.styles;
    expect(stylesString).toContain('border-radius');
    expect(stylesString).toContain('6px');
    expect(stylesString).toContain('border-width');
    expect(stylesString).toContain('overflow');
    expect(stylesString).toContain('hidden');
  });

  it('should apply shadow and border-radius to suggestion widget', () => {
    const euiThemeContext = createMockEuiThemeContext();
    const styles = getMonacoWorkflowOverridesStyles(euiThemeContext);

    const stylesString = styles.styles;
    expect(stylesString).toContain('.monaco-editor .suggest-widget');
    expect(stylesString).toContain('border-radius');
    expect(stylesString).toContain('6px');
  });

  it('should style hover widget with proper selectors', () => {
    const euiThemeContext = createMockEuiThemeContext();
    const styles = getMonacoWorkflowOverridesStyles(euiThemeContext);

    const stylesString = styles.styles;
    expect(stylesString).toContain('.monaco-editor .monaco-editor-hover');
    expect(stylesString).toContain('.monaco-hover');
  });

  it('should include hover content styling', () => {
    const euiThemeContext = createMockEuiThemeContext();
    const styles = getMonacoWorkflowOverridesStyles(euiThemeContext);

    const stylesString = styles.styles;
    expect(stylesString).toContain('.monaco-hover-content');
    expect(stylesString).toContain('padding');
    expect(stylesString).toContain('12px');
    expect(stylesString).toContain('16px');
  });

  it('should style markdown elements in hover', () => {
    const euiThemeContext = createMockEuiThemeContext();
    const styles = getMonacoWorkflowOverridesStyles(euiThemeContext);

    const stylesString = styles.styles;
    expect(stylesString).toContain('.monaco-editor .monaco-editor-hover h2');
    expect(stylesString).toContain('.monaco-editor .monaco-editor-hover h3');
    expect(stylesString).toContain('.monaco-editor .monaco-editor-hover code');
    expect(stylesString).toContain('.monaco-editor .monaco-editor-hover pre');
  });

  it('should use theme colors for styling', () => {
    const euiThemeContext = createMockEuiThemeContext();
    const styles = getMonacoWorkflowOverridesStyles(euiThemeContext);

    const stylesString = styles.styles;
    expect(stylesString).toContain(euiThemeContext.euiTheme.colors.primaryText);
    expect(stylesString).toContain(euiThemeContext.euiTheme.colors.primary);
    expect(stylesString).toContain(euiThemeContext.euiTheme.colors.backgroundBaseSubdued);
  });
});
