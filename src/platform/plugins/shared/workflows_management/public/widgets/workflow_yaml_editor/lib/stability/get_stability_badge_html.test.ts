/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { buildStabilityBadgeHtml, getStabilityBadgeHtml } from './get_stability_badge_html';
import { setMockStabilityBadgeThemeForTests } from './set_mock_stability_badge_theme_for_tests';
import {
  getStabilityBadgeColors,
  resetStabilityBadgeThemeContextForTests,
} from './stability_badge_theme';

describe('getStabilityBadgeHtml', () => {
  beforeEach(() => {
    setMockStabilityBadgeThemeForTests();
  });

  it('returns tech preview badge markup', () => {
    const html = getStabilityBadgeHtml('tech_preview');
    expect(html).toContain('<img src="data:image/svg+xml,');
    expect(html).toContain('Tech preview');
  });

  it('returns beta badge markup', () => {
    const html = getStabilityBadgeHtml('beta');
    expect(html).toContain('Beta');
  });

  it('returns empty string for stable stability without requiring theme', () => {
    resetStabilityBadgeThemeContextForTests();
    expect(getStabilityBadgeHtml('stable')).toBe('');
  });

  it('throws when theme context is not initialized', () => {
    resetStabilityBadgeThemeContextForTests();
    expect(() => getStabilityBadgeHtml('tech_preview')).toThrow(/setStabilityBadgeThemeContext/);
  });

  it('uses theme colors in generated svg', () => {
    const html = buildStabilityBadgeHtml('Tech preview', getStabilityBadgeColors());
    const decoded = decodeURIComponent(html.split('data:image/svg+xml,')[1]?.split('"')[0] ?? '');
    expect(decoded).toContain('fill="#111111"');
    expect(decoded).toContain('stroke="#444444"');
    expect(decoded).toContain('fill="#eeeeee"');
  });
});

describe('buildStabilityBadgeHtml', () => {
  it('escapes svg text in badge label', () => {
    const html = buildStabilityBadgeHtml('A<B"', {
      fill: '#fff',
      stroke: '#000',
      text: '#111',
    });
    const decoded = decodeURIComponent(html.split('data:image/svg+xml,')[1]?.split('"')[0] ?? '');
    expect(decoded).not.toContain('<B"');
    expect(decoded).toContain('&lt;');
    expect(decoded).toContain('&quot;');
  });

  it('allocates wider badges for long labels', () => {
    const short = buildStabilityBadgeHtml('Beta', { fill: '#fff', stroke: '#000', text: '#111' });
    const long = buildStabilityBadgeHtml('A very long experimental label', {
      fill: '#fff',
      stroke: '#000',
      text: '#111',
    });
    const shortWidth = Number(short.match(/width="(\d+)"/)?.[1]);
    const longWidth = Number(long.match(/width="(\d+)"/)?.[1]);
    expect(longWidth).toBeGreaterThan(shortWidth);
  });
});
