/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { PaletteRegistry, PaletteDefinition } from '@kbn/coloring';
import { getActivePaletteName } from '@kbn/coloring';
import type { CoreTheme } from '@kbn/core/public';
import type { Observable } from 'rxjs';
import { distinctUntilChanged, firstValueFrom, from, map, shareReplay, switchMap } from 'rxjs';

export interface PaletteServiceSetup {
  /**
   * Lazily loads the palette definitions and resolves to a registry reflecting the
   * current theme. The returned registry is "live": its `get`/`getAll` methods always
   * read the palettes built for the latest theme, so consumers that re-render on theme
   * changes pick up the new colors automatically without re-fetching.
   */
  getPalettes: () => Promise<PaletteRegistry>;
  /**
   * An observable of the palette registry that emits a new registry whenever the
   * theme values relevant to palettes (dark mode / theme name) change.
   */
  getPalettes$: () => Observable<PaletteRegistry>;
}

export class PaletteService {
  private theme$?: Observable<CoreTheme>;
  private palettes$?: Observable<PaletteRegistry>;
  private currentPalettes?: Record<string, PaletteDefinition<unknown>>;

  public setup(theme$: Observable<CoreTheme>): PaletteServiceSetup {
    this.theme$ = theme$;
    return {
      getPalettes: () => firstValueFrom(this.getPalettes$()),
      getPalettes$: () => this.getPalettes$(),
    };
  }

  private getPalettes$(): Observable<PaletteRegistry> {
    if (!this.theme$) {
      throw new Error('PaletteService not initialized');
    }

    if (!this.palettes$) {
      const theme$ = this.theme$;
      this.palettes$ = from(import('./palettes')).pipe(
        switchMap(({ buildPalettes }) =>
          theme$.pipe(
            distinctUntilChanged(
              (previous, next) => previous.darkMode === next.darkMode && previous.name === next.name
            ),
            map((theme) => {
              this.currentPalettes = buildPalettes(theme);
              return this.createRegistry();
            })
          )
        ),
        // `shareReplay(1)` keeps a single upstream `theme$` subscription alive for the
        // lifetime of the service so `currentPalettes` stays current even for consumers
        // that only pulled a registry once via `getPalettes()`.
        shareReplay(1)
      );
    }

    return this.palettes$;
  }

  private createRegistry(): PaletteRegistry {
    return {
      get: (name: string) => this.currentPalettes![getActivePaletteName(name)],
      getAll: () => Object.values(this.currentPalettes!),
    };
  }
}
