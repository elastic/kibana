/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useMemo, useCallback } from 'react';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiPanel, EuiTitle, EuiSpacer } from '@elastic/eui';

import { SelectOption, SwitchOption } from '../../../../../../../vis_default_editor/public';
import { VisParams, ValueAxis } from '../../../../types';
import { ValidationVisOptionsProps } from '../../common';

type GridPanelOptions = ValidationVisOptionsProps<VisParams>;

function GridPanel({ stateParams, setValue }: GridPanelOptions) {
  const setGrid = useCallback(
    <T extends keyof VisParams['grid']>(paramName: T, value: VisParams['grid'][T]) =>
      setValue('grid', { ...stateParams.grid, [paramName]: value }),
    [stateParams.grid, setValue]
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
        label={i18n.translate('visTypeXy.controls.pointSeries.gridAxis.xAxisLinesLabel', {
          defaultMessage: 'Show X-axis lines',
        })}
        paramName="categoryLines"
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
