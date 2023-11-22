/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { useEffect, useRef, useState } from 'react';
import { Observable, BehaviorSubject } from 'rxjs';

import { CoreSetup, CoreTheme } from '@kbn/core/public';
import { DARK_THEME, LIGHT_THEME, PartialTheme, Theme } from '@elastic/charts';

export class ThemeService {
  /** Returns default charts theme */
  public readonly chartsDefaultBaseTheme = LIGHT_THEME;

  private theme$?: Observable<CoreTheme>;
  private _chartsBaseTheme$ = new BehaviorSubject(this.chartsDefaultBaseTheme);

  /** An observable of the current charts base theme */
  public chartsBaseTheme$ = this._chartsBaseTheme$.asObservable();

  /** An observable boolean for dark mode of kibana */
  public get darkModeEnabled$(): Observable<CoreTheme> {
    if (!this.theme$) {
      throw new Error('ThemeService not initialized');
    }

    return this.theme$;
  }

  /** A React hook for consuming the dark mode value */
  public useDarkMode = (): boolean => {
    const [value, update] = useState(false);

    useEffect(() => {
      const s = this.darkModeEnabled$.subscribe((val) => {
        update(val.darkMode);
      });
      return () => s.unsubscribe();
    }, []);

    return value;
  };

  /**
   * @deprecated No longer need to use theme on top of baseTheme, see https://github.com/elastic/kibana/pull/170914#issuecomment-1823014121
   */
  public useChartsTheme = (): PartialTheme => {
    return {};
  };

  /** A React hook for consuming the charts theme */
  public useChartsBaseTheme = (): Theme => {
    const [value, update] = useState(this._chartsBaseTheme$.getValue());
    const ref = useRef(value);

    useEffect(() => {
      const s = this.chartsBaseTheme$.subscribe((val) => {
        if (val !== ref.current) {
          ref.current = val;
          update(val);
        }
      });
      return () => s.unsubscribe();
    }, []);

    return value;
  };

  /** initialize service with uiSettings */
  public init(theme: CoreSetup['theme']) {
    this.theme$ = theme.theme$;
    this.theme$.subscribe(({ darkMode }) => {
      this._chartsBaseTheme$.next(darkMode ? DARK_THEME : LIGHT_THEME);
    });
  }
}
