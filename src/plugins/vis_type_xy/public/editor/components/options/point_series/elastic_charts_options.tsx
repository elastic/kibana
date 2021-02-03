/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React, { useState, useEffect } from 'react';

import { i18n } from '@kbn/i18n';
import { METRIC_TYPE } from '@kbn/analytics';

import {
  SelectOption,
  SwitchOption,
  PalettePicker,
} from '../../../../../../vis_default_editor/public';
import { PaletteRegistry } from '../../../../../../charts/public';

import { ChartType } from '../../../../../common';
import { VisParams } from '../../../../types';
import { ValidationVisOptionsProps } from '../../common';
import { getPalettesService, getTrackUiMetric } from '../../../../services';

export function ElasticChartsOptions(props: ValidationVisOptionsProps<VisParams>) {
  const trackUiMetric = getTrackUiMetric();
  const [palettesRegistry, setPalettesRegistry] = useState<PaletteRegistry | null>(null);
  const { stateParams, setValue, vis, aggs } = props;

  const hasLineChart = stateParams.seriesParams.some(
    ({ type, data: { id: paramId } }) =>
      (type === ChartType.Line || type === ChartType.Area) &&
      aggs.aggs.find(({ id }) => id === paramId)?.enabled
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

      {hasLineChart && (
        <SelectOption
          data-test-subj="fittingFunction"
          label={i18n.translate('visTypeXy.editors.elasticChartsOptions.missingValuesLabel', {
            defaultMessage: 'Fill missing values',
          })}
          options={vis.type.editorConfig.collections.fittingFunctions}
          paramName="fittingFunction"
          value={stateParams.fittingFunction}
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
    </>
  );
}
