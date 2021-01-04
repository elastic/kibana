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

import React, { useMemo, useEffect, useCallback } from 'react';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiPanel, EuiTitle, EuiSpacer } from '@elastic/eui';

import { SelectOption, SwitchOption } from '../../../../../../vis_default_editor/public';
import { VisParams, ValueAxis } from '../../../../types';
import { ValidationVisOptionsProps } from '../../common';

type GridPanelOptions = ValidationVisOptionsProps<
  VisParams,
  {
    showElasticChartsOptions: boolean;
  }
>;

function GridPanel({ stateParams, setValue, hasHistogramAgg, extraProps }: GridPanelOptions) {
  const setGrid = useCallback(
    <T extends keyof VisParams['grid']>(paramName: T, value: VisParams['grid'][T]) =>
      setValue('grid', { ...stateParams.grid, [paramName]: value }),
    [stateParams.grid, setValue]
  );

  const disableCategoryGridLines = useMemo(
    () => !extraProps?.showElasticChartsOptions && hasHistogramAgg,
    [extraProps?.showElasticChartsOptions, hasHistogramAgg]
  );

  const options = useMemo(
    () => [
      ...stateParams.valueAxes.map(({ id, name }: ValueAxis) => ({
        text: name,
        value: id,
      })),
      {
        text: i18n.translate('visTypeXy.controls.pointSeries.gridAxis.dontShowLabel', {
          defaultMessage: "Don't show",
        }),
        value: '',
      },
    ],
    [stateParams.valueAxes]
  );

  useEffect(() => {
    if (disableCategoryGridLines) {
      setGrid('categoryLines', false);
    }
  }, [disableCategoryGridLines, setGrid]);

  return (
    <EuiPanel paddingSize="s">
      <EuiTitle size="xs">
        <h3>
          <FormattedMessage
            id="visTypeXy.controls.pointSeries.gridAxis.gridText"
            defaultMessage="Grid"
          />
        </h3>
      </EuiTitle>

      <EuiSpacer size="m" />

      <SwitchOption
        disabled={disableCategoryGridLines}
        label={i18n.translate('visTypeXy.controls.pointSeries.gridAxis.xAxisLinesLabel', {
          defaultMessage: 'Show X-axis lines',
        })}
        paramName="categoryLines"
        tooltip={
          disableCategoryGridLines
            ? i18n.translate('visTypeXy.controls.pointSeries.gridAxis.yAxisLinesDisabledTooltip', {
                defaultMessage: "X-axis lines can't show for histograms.",
              })
            : undefined
        }
        value={stateParams.grid.categoryLines}
        setValue={setGrid}
        data-test-subj="showCategoryLines"
      />

      <SelectOption
        id="gridAxis"
        label={i18n.translate('visTypeXy.controls.pointSeries.gridAxis.yAxisLinesLabel', {
          defaultMessage: 'Y-axis lines',
        })}
        options={options}
        paramName="valueAxis"
        value={stateParams.grid.valueAxis ?? ''}
        setValue={setGrid}
      />
    </EuiPanel>
  );
}

export { GridPanel };
