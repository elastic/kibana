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

import { EuiChartUtils } from './eui_chart_utils';
import { coreMock } from '../../../core/public/mocks';
const startMock = coreMock.createStart();

describe('EuiChartUtils', () => {
  const getStart = () => {
    return new EuiChartUtils().start(startMock);
  };

  describe('getChartsTheme()', () => {
    it('returns the light theme when not in dark mode', () => {
      expect(getStart().getChartsTheme().lineSeriesStyle.point.fill).toEqual(
        'rgba(255, 255, 255, 1)'
      );
    });

    it('returns the correct theme combined with a custom one', () => {
      const combinedTheme = getStart().getChartsTheme({
        lineSeriesStyle: {
          point: {
            radius: 30,
          },
        },
      });
      expect(combinedTheme.lineSeriesStyle.point.fill).toEqual('rgba(255, 255, 255, 1)');
      expect(combinedTheme.lineSeriesStyle.point.radius).toEqual(30);
    });

    describe('in dark mode', () => {
      it(`returns the dark theme`, () => {
        const darkStart = () => {
          // Fake dark theme turned returning true
          startMock.uiSettings.get.mockReturnValue(true);
          return new EuiChartUtils().start(startMock);
        };

        expect(darkStart().getChartsTheme().lineSeriesStyle.point.fill).toEqual(
          'rgba(29, 30, 36, 1)'
        );
      });
    });
  });
});
