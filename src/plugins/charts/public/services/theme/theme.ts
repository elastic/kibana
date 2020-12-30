/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { useEffect, useState } from 'react';
import { Observable, BehaviorSubject } from 'rxjs';

import { CoreSetup } from 'kibana/public';
import { DARK_THEME, LIGHT_THEME, PartialTheme, Theme } from '@elastic/charts';
import { EUI_CHARTS_THEME_DARK, EUI_CHARTS_THEME_LIGHT } from '@elastic/eui/dist/eui_charts_theme';

export class ThemeService {
  /** Returns default charts theme */
  public readonly chartsDefaultTheme = EUI_CHARTS_THEME_LIGHT.theme;
  public readonly chartsDefaultBaseTheme = LIGHT_THEME;

  private _uiSettingsDarkMode$?: Observable<boolean>;
  private _chartsTheme$ = new BehaviorSubject(this.chartsDefaultTheme);
  private _chartsBaseTheme$ = new BehaviorSubject(this.chartsDefaultBaseTheme);

  /** An observable of the current charts theme */
  public chartsTheme$ = this._chartsTheme$.asObservable();

  /** An observable of the current charts base theme */
  public chartsBaseTheme$ = this._chartsBaseTheme$.asObservable();

  /** An observable boolean for dark mode of kibana */
  public get darkModeEnabled$(): Observable<boolean> {
    if (!this._uiSettingsDarkMode$) {
      throw new Error('ThemeService not initialized');
    }

    return this._uiSettingsDarkMode$;
  }

  /** A React hook for consuming the dark mode value */
  public useDarkMode = (): boolean => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const [value, update] = useState(false);

    // eslint-disable-next-line react-hooks/rules-of-hooks
    useEffect(() => {
      const s = this.darkModeEnabled$.subscribe(update);
      return () => s.unsubscribe();
    }, []);

    return value;
  };

  /** A React hook for consuming the charts theme */
  public useChartsTheme = (): PartialTheme => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const [value, update] = useState(this.chartsDefaultTheme);

    // eslint-disable-next-line react-hooks/rules-of-hooks
    useEffect(() => {
      const s = this.chartsTheme$.subscribe(update);
      return () => s.unsubscribe();
    }, []);

    return value;
  };

  /** A React hook for consuming the charts theme */
  public useChartsBaseTheme = (): Theme => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const [value, update] = useState(this.chartsDefaultBaseTheme);

    // eslint-disable-next-line react-hooks/rules-of-hooks
    useEffect(() => {
      const s = this.chartsBaseTheme$.subscribe(update);
      return () => s.unsubscribe();
    }, []);

    return value;
  };

  /** initialize service with uiSettings */
  public init(uiSettings: CoreSetup['uiSettings']) {
    this._uiSettingsDarkMode$ = uiSettings.get$<boolean>('theme:darkMode');
    this._uiSettingsDarkMode$.subscribe((darkMode) => {
      this._chartsTheme$.next(
        darkMode ? EUI_CHARTS_THEME_DARK.theme : EUI_CHARTS_THEME_LIGHT.theme
      );
      this._chartsBaseTheme$.next(darkMode ? DARK_THEME : LIGHT_THEME);
    });
  }
}
