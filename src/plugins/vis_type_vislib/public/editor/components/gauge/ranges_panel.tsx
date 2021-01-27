/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React, { useCallback } from 'react';
import { EuiPanel, EuiSpacer, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import {
  ColorRanges,
  SetColorRangeValue,
  SwitchOption,
  ColorSchemaOptions,
} from '../../../../../vis_default_editor/public';
import { ColorSchemaParams, ColorSchemas } from '../../../../../charts/public';
import { GaugeOptionsInternalProps } from '../gauge';
import { Gauge } from '../../../gauge';

function RangesPanel({
  setGaugeValue,
  setTouched,
  setValidity,
  setValue,
  stateParams,
  uiState,
  vis,
}: GaugeOptionsInternalProps) {
  const setColorSchemaOptions = useCallback(
    <T extends keyof ColorSchemaParams>(paramName: T, value: ColorSchemaParams[T]) => {
      setGaugeValue(paramName, value as Gauge[T]);
      // set outline if color schema is changed to greys
      // if outline wasn't set explicitly yet
      if (
        paramName === 'colorSchema' &&
        (value as string) === ColorSchemas.Greys &&
        typeof stateParams.gauge.outline === 'undefined'
      ) {
        setGaugeValue('outline', true);
      }
    },
    [setGaugeValue, stateParams]
  );

  return (
    <EuiPanel paddingSize="s">
      <EuiTitle size="xs">
        <h3>
          <FormattedMessage
            id="visTypeVislib.controls.gaugeOptions.rangesTitle"
            defaultMessage="Ranges"
          />
        </h3>
      </EuiTitle>
      <EuiSpacer size="s" />

      <ColorRanges
        data-test-subj="gaugeColorRange"
        colorsRange={stateParams.gauge.colorsRange}
        setValue={setGaugeValue as SetColorRangeValue}
        setTouched={setTouched}
        setValidity={setValidity}
      />

      <SwitchOption
        disabled={stateParams.gauge.colorsRange.length < 2}
        label={i18n.translate('visTypeVislib.controls.gaugeOptions.autoExtendRangeLabel', {
          defaultMessage: 'Auto extend range',
        })}
        tooltip={i18n.translate('visTypeVislib.controls.gaugeOptions.extendRangeTooltip', {
          defaultMessage: 'Extends range to the maximum value in your data.',
        })}
        paramName="extendRange"
        value={stateParams.gauge.extendRange}
        setValue={setGaugeValue}
      />

      <SwitchOption
        data-test-subj="gaugePercentageMode"
        label={i18n.translate('visTypeVislib.controls.gaugeOptions.percentageModeLabel', {
          defaultMessage: 'Percentage mode',
        })}
        paramName="percentageMode"
        value={stateParams.gauge.percentageMode}
        setValue={setGaugeValue}
      />

      <ColorSchemaOptions
        disabled={stateParams.gauge.colorsRange.length < 2}
        colorSchema={stateParams.gauge.colorSchema}
        colorSchemas={vis.type.editorConfig.collections.colorSchemas}
        invertColors={stateParams.gauge.invertColors}
        uiState={uiState}
        setValue={setColorSchemaOptions}
      />

      <SwitchOption
        label={i18n.translate('visTypeVislib.controls.gaugeOptions.showOutline', {
          defaultMessage: 'Show outline',
        })}
        paramName="outline"
        value={stateParams.gauge.outline}
        setValue={setGaugeValue}
      />

      <SwitchOption
        label={i18n.translate('visTypeVislib.controls.gaugeOptions.showLegendLabel', {
          defaultMessage: 'Show legend',
        })}
        paramName="addLegend"
        value={stateParams.addLegend}
        setValue={setValue}
      />

      <SwitchOption
        label={i18n.translate('visTypeVislib.controls.gaugeOptions.showScaleLabel', {
          defaultMessage: 'Show scale',
        })}
        paramName="show"
        value={stateParams.gauge.scale.show}
        setValue={(paramName, value) =>
          setGaugeValue('scale', { ...stateParams.gauge.scale, [paramName]: value })
        }
      />
    </EuiPanel>
  );
}

export { RangesPanel };
