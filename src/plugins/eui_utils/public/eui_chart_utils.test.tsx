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

import { BehaviorSubject } from 'rxjs';

import { EuiChartUtils } from './eui_chart_utils';
import { coreMock } from '../../../core/public/mocks';
import { take } from 'rxjs/operators';
const startMock = coreMock.createStart();

describe('EuiChartUtils', () => {
  describe('getChartsTheme()', () => {
    it('returns the light theme when not in dark mode', async () => {
      startMock.uiSettings.get$.mockReturnValue(new BehaviorSubject(false));

      expect(
        (await new EuiChartUtils()
          .start(startMock)
          .getChartsTheme$()
          .pipe(take(1))
          .toPromise()).lineSeriesStyle!.point!.fill
      ).toEqual('rgba(255, 255, 255, 1)');
    });

    describe('in dark mode', () => {
      it(`returns the dark theme`, async () => {
        // Fake dark theme turned returning true
        startMock.uiSettings.get$.mockReturnValue(new BehaviorSubject(true));

        expect(
          (await new EuiChartUtils()
            .start(startMock)
            .getChartsTheme$()
            .pipe(take(1))
            .toPromise()).lineSeriesStyle!.point!.fill
        ).toEqual('rgba(29, 30, 36, 1)');
      });
    });
  });
});
