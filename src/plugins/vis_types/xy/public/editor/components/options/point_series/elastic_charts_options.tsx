/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useState, useEffect } from 'react';
import type { PaletteRegistry } from '@kbn/coloring';
import { i18n } from '@kbn/i18n';
import { METRIC_TYPE } from '@kbn/analytics';
import { EuiFormRow, EuiRange } from '@elastic/eui';
import {
  SelectOption,
  SwitchOption,
  PalettePicker,
} from '../../../../../../../vis_default_editor/public';

import { ChartType } from '../../../../../common';
import { VisParams } from '../../../../types';
import { ValidationVisOptionsProps } from '../../common';
import { getPalettesService, getTrackUiMetric } from '../../../../services';
import { getFittingFunctions } from '../../../collections';

const fittingFunctions = getFittingFunctions();

export function ElasticChartsOptions(props: ValidationVisOptionsProps<VisParams>) {
  const trackUiMetric = getTrackUiMetric();
  const [palettesRegistry, setPalettesRegistry] = useState<PaletteRegistry | null>(null);
  const { stateParams, setValue, aggs } = props;

  const isLineChart = stateParams.seriesParams.some(
    ({ type, data: { id: paramId } }) =>
      type === ChartType.Line && aggs.aggs.find(({ id }) => id === paramId)?.enabled
  );

  const isAreaChart = stateParams.seriesParams.some(
    ({ type, data: { id: paramId } }) =>
      type === ChartType.Area && aggs.aggs.find(({ id }) => id === paramId)?.enabled
  );

  useEffect(() => {
    const fetchPalettes = async () => {
      const palettes = await getPalettesService().getPalettes();
      setPalettesRegistry(palettes);
    };
    fetchPalettes();
  }, []);

  return (
    <>
      <SwitchOption
        data-test-subj="detailedTooltip"
        label={i18n.translate('visTypeXy.editors.elasticChartsOptions.detailedTooltip.label', {
          defaultMessage: 'Show detailed tooltip',
        })}
        tooltip={i18n.translate('visTypeXy.editors.elasticChartsOptions.detailedTooltip.tooltip', {
          defaultMessage:
            'Enables the legacy detailed tooltip for displaying a single value. When disabled, a new summarized tooltip will be used to display multiple values.',
        })}
        paramName="detailedTooltip"
        value={stateParams.detailedTooltip}
        setValue={(paramName, value) => {
          if (trackUiMetric) {
            trackUiMetric(METRIC_TYPE.CLICK, 'detailed_tooltip_switched');
          }
          setValue(paramName, value);
        }}
      />

      {(isLineChart || isAreaChart) && (
        <SelectOption
          data-test-subj="fittingFunction"
          label={i18n.translate('visTypeXy.editors.elasticChartsOptions.missingValuesLabel', {
            defaultMessage: 'Fill missing values',
          })}
          options={fittingFunctions}
          paramName="fittingFunction"
          value={stateParams.fittingFunction ?? fittingFunctions[2].value}
          setValue={(paramName, value) => {
            if (trackUiMetric) {
              trackUiMetric(METRIC_TYPE.CLICK, 'fitting_function_selected');
            }
            setValue(paramName, value);
          }}
        />
      )}

      {palettesRegistry && (
        <PalettePicker
          palettes={palettesRegistry}
          activePalette={stateParams.palette}
          paramName="palette"
          setPalette={(paramName, value) => {
            if (trackUiMetric) {
              trackUiMetric(METRIC_TYPE.CLICK, 'palette_selected');
            }
            setValue(paramName, value);
          }}
        />
      )}
      {isAreaChart && (
        <EuiFormRow
          label={i18n.translate('visTypeXy.editors.elasticChartsOptions.fillOpacity', {
            defaultMessage: 'Fill opacity',
          })}
          fullWidth
          display="rowCompressed"
        >
          <EuiRange
            data-test-subj="fillColorOpacity"
            value={stateParams.fillOpacity ?? 0.3}
            min={0}
            max={1}
            step={0.1}
            showInput
            fullWidth
            compressed
            onChange={(e) => {
              setValue('fillOpacity', Number(e.currentTarget.value));
            }}
          />
        </EuiFormRow>
      )}
    </>
  );
}
