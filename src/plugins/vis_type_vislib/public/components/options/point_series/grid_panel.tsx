/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useMemo, useEffect, useCallback } from 'react';

import { EuiPanel, EuiTitle, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';

import { VisOptionsProps } from 'src/plugins/vis_default_editor/public';
import { SelectOption, SwitchOption } from '../../../../../charts/public';
import { BasicVislibParams, ValueAxis } from '../../../types';

function GridPanel({ stateParams, setValue, hasHistogramAgg }: VisOptionsProps<BasicVislibParams>) {
  const setGrid = useCallback(
    <T extends keyof BasicVislibParams['grid']>(
      paramName: T,
      value: BasicVislibParams['grid'][T]
    ) => setValue('grid', { ...stateParams.grid, [paramName]: value }),
    [stateParams.grid, setValue]
  );

  const options = useMemo(
    () => [
      ...stateParams.valueAxes.map(({ id, name }: ValueAxis) => ({
        text: name,
        value: id,
      })),
      {
        text: i18n.translate('visTypeVislib.controls.pointSeries.gridAxis.dontShowLabel', {
          defaultMessage: "Don't show",
        }),
        value: '',
      },
    ],
    [stateParams.valueAxes]
  );

  useEffect(() => {
    if (hasHistogramAgg) {
      setGrid('categoryLines', false);
    }
  }, [hasHistogramAgg, setGrid]);

  return (
    <EuiPanel paddingSize="s">
      <EuiTitle size="xs">
        <h3>
          <FormattedMessage
            id="visTypeVislib.controls.pointSeries.gridAxis.gridText"
            defaultMessage="Grid"
          />
        </h3>
      </EuiTitle>

      <EuiSpacer size="m" />

      <SwitchOption
        disabled={hasHistogramAgg}
        label={i18n.translate('visTypeVislib.controls.pointSeries.gridAxis.xAxisLinesLabel', {
          defaultMessage: 'Show X-axis lines',
        })}
        paramName="categoryLines"
        tooltip={
          hasHistogramAgg
            ? i18n.translate(
                'visTypeVislib.controls.pointSeries.gridAxis.yAxisLinesDisabledTooltip',
                {
                  defaultMessage: "X-axis lines can't show for histograms.",
                }
              )
            : undefined
        }
        value={stateParams.grid.categoryLines}
        setValue={setGrid}
        data-test-subj="showCategoryLines"
      />

      <SelectOption
        id="gridAxis"
        label={i18n.translate('visTypeVislib.controls.pointSeries.gridAxis.yAxisLinesLabel', {
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

export { GridPanel };
