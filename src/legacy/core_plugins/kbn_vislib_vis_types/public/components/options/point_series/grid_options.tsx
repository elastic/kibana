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
import React, { useMemo, useEffect } from 'react';
import { EuiPanel, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';

import { VisOptionsProps } from 'ui/vis/editors/default';
import { SelectOption, SwitchOption } from '../../common';
import { BasicVislibParams, ValueAxis } from '../../../types';

function GridOptions({
  stateParams,
  setValue,
  hasHistogramAgg,
}: VisOptionsProps<BasicVislibParams>) {
  const setGrid = <T extends keyof BasicVislibParams['grid']>(
    paramName: T,
    value: BasicVislibParams['grid'][T]
  ) => setValue('grid', { ...stateParams.grid, [paramName]: value });

  const options = useMemo(
    () => [
      ...stateParams.valueAxes.map(({ id, name }: ValueAxis) => ({
        text: name,
        value: id,
      })),
      {
        text: i18n.translate('kbnVislibVisTypes.controls.pointSeries.gridAxis.dontShowLabel', {
          defaultMessage: "Don't show",
        }),
        value: '',
      },
    ],
    [stateParams.valueAxes.map(({ id }: ValueAxis) => id)]
  );

  useEffect(() => {
    if (hasHistogramAgg) {
      setGrid('categoryLines', false);
    }
  }, [hasHistogramAgg]);

  return (
    <EuiPanel paddingSize="s">
      <EuiTitle size="xs">
        <h2>
          <FormattedMessage
            id="kbnVislibVisTypes.controls.pointSeries.gridAxis.gridText"
            defaultMessage="Grid"
          />
        </h2>
      </EuiTitle>

      <SwitchOption
        disabled={hasHistogramAgg}
        label={i18n.translate('kbnVislibVisTypes.controls.pointSeries.gridAxis.xAxisLinesLabel', {
          defaultMessage: 'Show x-axis lines',
        })}
        paramName="categoryLines"
        tooltip={
          hasHistogramAgg
            ? i18n.translate(
                'kbnVislibVisTypes.controls.pointSeries.gridAxis.yAxisLinesDisabledTooltip',
                {
                  defaultMessage: "X-axis lines can't show for histograms.",
                }
              )
            : undefined
        }
        value={stateParams.grid.categoryLines}
        setValue={setGrid}
        dataTestSubj="showCategoryLines"
      />

      <SelectOption
        id="gridAxis"
        label={i18n.translate('kbnVislibVisTypes.controls.pointSeries.gridAxis.yAxisLinesLabel', {
          defaultMessage: 'Y-axis lines',
        })}
        options={options}
        paramName="valueAxis"
        value={stateParams.grid.valueAxis || ''}
        setValue={setGrid}
      />
    </EuiPanel>
  );
}

export { GridOptions };
