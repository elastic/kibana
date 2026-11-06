/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render } from '@testing-library/react';
import { GlobalCursorOverride } from './global_cursor_override';

// Emotion's `Global` inserts rules via CSSOM (`insertRule`), so the
// `<style>` tag's `textContent` stays empty in jsdom - read `cssRules`
// instead.
const getInjectedCss = (): string =>
  Array.from(document.styleSheets)
    .flatMap((sheet) => {
      try {
        return Array.from(sheet.cssRules).map((rule) => rule.cssText);
      } catch {
        return [];
      }
    })
    .join('\n');

describe('GlobalCursorOverride', () => {
  it('forces the given cursor on every element', () => {
    render(<GlobalCursorOverride cursor="crosshair" />);

    const injectedCss = getInjectedCss();
    expect(injectedCss).toContain('cursor: crosshair !important');
  });

  it('does not reset devtool-ignore elements by default', () => {
    render(<GlobalCursorOverride cursor="crosshair" />);

    expect(getInjectedCss()).not.toContain('[data-devtool-ignore]');
  });

  it('resets the cursor on devtool-ignore elements and their contents when ignoredElementsCursor is set', () => {
    render(<GlobalCursorOverride cursor="crosshair" ignoredElementsCursor="default" />);

    const injectedCss = getInjectedCss();
    expect(injectedCss).toContain('[data-devtool-ignore]');
    expect(injectedCss).toContain('[data-devtool-ignore] *');
    expect(injectedCss).toContain('cursor: default !important');
  });

  it('keeps a pointer cursor on devtool-ignore buttons when allowButtons is true', () => {
    render(<GlobalCursorOverride cursor="crosshair" allowButtons />);

    const injectedCss = getInjectedCss();
    expect(injectedCss).toContain('[data-devtool-ignore] button');
    expect(injectedCss).toContain('[data-devtool-ignore] [role="button"]');
    expect(injectedCss).toContain('cursor: pointer !important');
  });
});
