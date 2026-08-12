/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BehaviorSubject } from 'rxjs';
import type { CoreTheme } from '@kbn/core/public';
import type { PaletteRegistry } from '@kbn/coloring';
import { PaletteService } from './service';
import { buildPalettes } from './palettes';

jest.mock('./palettes', () => ({
  buildPalettes: jest.fn((theme: CoreTheme) => ({
    default: {
      id: 'default',
      title: `default-${theme.darkMode ? 'dark' : 'light'}`,
    },
  })),
}));

const buildPalettesMock = buildPalettes as jest.MockedFunction<typeof buildPalettes>;

const lightTheme: CoreTheme = { darkMode: false, name: 'borealis' };
const darkTheme: CoreTheme = { darkMode: true, name: 'borealis' };

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('PaletteService', () => {
  beforeEach(() => {
    buildPalettesMock.mockClear();
  });

  it('resolves a registry built for the current theme', async () => {
    const theme$ = new BehaviorSubject<CoreTheme>(lightTheme);
    const { getPalettes } = new PaletteService().setup(theme$);

    const registry = await getPalettes();

    expect(registry.get('default').title).toBe('default-light');
  });

  it('emits a new registry when the dark mode changes', async () => {
    const theme$ = new BehaviorSubject<CoreTheme>(lightTheme);
    const { getPalettes$ } = new PaletteService().setup(theme$);

    const titles: string[] = [];
    const subscription = getPalettes$().subscribe((registry: PaletteRegistry) => {
      titles.push(registry.get('default').title);
    });
    await flush();

    theme$.next(darkTheme);
    await flush();

    expect(titles).toEqual(['default-light', 'default-dark']);
    subscription.unsubscribe();
  });

  it('does not rebuild palettes when irrelevant theme values change', async () => {
    const theme$ = new BehaviorSubject<CoreTheme>(lightTheme);
    const { getPalettes$ } = new PaletteService().setup(theme$);

    const subscription = getPalettes$().subscribe();
    await flush();

    // same darkMode/name, new object reference
    theme$.next({ ...lightTheme });
    await flush();

    expect(buildPalettesMock).toHaveBeenCalledTimes(1);
    subscription.unsubscribe();
  });

  it('keeps a previously resolved registry live across theme changes', async () => {
    const theme$ = new BehaviorSubject<CoreTheme>(lightTheme);
    const { getPalettes } = new PaletteService().setup(theme$);

    const registry = await getPalettes();
    expect(registry.get('default').title).toBe('default-light');

    theme$.next(darkTheme);
    await flush();

    expect(registry.get('default').title).toBe('default-dark');
  });

  it('stays live across repeated round-trip theme changes', async () => {
    const theme$ = new BehaviorSubject<CoreTheme>(lightTheme);
    const { getPalettes } = new PaletteService().setup(theme$);

    const registry = await getPalettes();
    expect(registry.get('default').title).toBe('default-light');

    theme$.next(darkTheme);
    await flush();
    expect(registry.get('default').title).toBe('default-dark');

    theme$.next(lightTheme);
    await flush();
    expect(registry.get('default').title).toBe('default-light');

    theme$.next(darkTheme);
    await flush();
    expect(registry.get('default').title).toBe('default-dark');
  });
});
