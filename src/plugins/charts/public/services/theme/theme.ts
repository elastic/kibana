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
import { map } from 'rxjs/operators';
import { Observable } from 'rxjs';

import { CoreSetup } from 'kibana/public';
import { RecursivePartial, Theme } from '@elastic/charts';
import { EUI_CHARTS_THEME_DARK, EUI_CHARTS_THEME_LIGHT } from '@elastic/eui/dist/eui_charts_theme';

export class ThemeService {
  private _chartsTheme$?: Observable<RecursivePartial<Theme>>;

  /** Returns default charts theme */
  public readonly chartsDefaultTheme = EUI_CHARTS_THEME_LIGHT.theme;

  /** An observable of the current charts theme */
  public get chartsTheme$(): Observable<RecursivePartial<Theme>> {
    if (!this._chartsTheme$) {
      throw new Error('ThemeService not initialized');
    }

    return this._chartsTheme$;
  }

  /** A React hook for consuming the charts theme */
  public useChartsTheme = () => {
    const [value, update] = useState(this.chartsDefaultTheme);

    useEffect(() => {
      const s = this.chartsTheme$.subscribe(update);
      return () => s.unsubscribe();
    }, []);

    return value;
  };

  /** initialize service with uiSettings */
  public init(uiSettings: CoreSetup['uiSettings']) {
    this._chartsTheme$ = uiSettings
      .get$('theme:darkMode')
      .pipe(
        map(darkMode => (darkMode ? EUI_CHARTS_THEME_DARK.theme : EUI_CHARTS_THEME_LIGHT.theme))
      );
  }
}
