/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { UseEuiTheme } from '@elastic/eui';
import { buildSuggestTechPreviewBadgeRules } from './get_suggest_tech_preview_badge_styles';

const createMockEuiThemeContext = (): UseEuiTheme => ({
  euiTheme: {
    colors: {
      textPrimary: '#343741',
      backgroundBasePlain: '#ffffff',
      backgroundBaseInteractiveSelect: '#e6f0f8',
      vis: {
        euiColorVis2: '#017d73',
      },
    },
    components: {
      badgeBorderColorHollow: '#d3dae6',
    },
  } as UseEuiTheme['euiTheme'],
  colorMode: 'LIGHT',
  modifications: {},
  highContrastMode: false,
});

describe('buildSuggestTechPreviewBadgeRules', () => {
  it('generates aria-label scoped rules with flask mask styling', () => {
    const css = buildSuggestTechPreviewBadgeRules(
      ['cases.caseCreated'],
      createMockEuiThemeContext()
    );

    expect(css).toContain('[aria-label^="cases.caseCreated"]');
    expect(css).toContain('.main > .left::after');
    expect(css).not.toContain('.monaco-icon-label');
    expect(css).toContain('#d3dae6');
  });

  it('escapes double quotes in aria-label prefixes', () => {
    const css = buildSuggestTechPreviewBadgeRules(['say"hello'], createMockEuiThemeContext());

    expect(css).toContain('[aria-label^="say\\"hello"]');
  });
});
