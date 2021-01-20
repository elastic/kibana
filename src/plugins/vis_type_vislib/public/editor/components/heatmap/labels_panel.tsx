/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React, { useCallback } from 'react';

import { EuiColorPicker, EuiFormRow, EuiPanel, EuiSpacer, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';

import { VisOptionsProps, SwitchOption } from '../../../../../vis_default_editor/public';
import { ValueAxis } from '../../../../../vis_type_xy/public';

import { HeatmapVisParams } from '../../../heatmap';

const VERTICAL_ROTATION = 270;

interface LabelsPanelProps {
  valueAxis: ValueAxis;
  setValue: VisOptionsProps<HeatmapVisParams>['setValue'];
}

function LabelsPanel({ valueAxis, setValue }: LabelsPanelProps) {
  const rotateLabels = valueAxis.labels.rotate === VERTICAL_ROTATION;

  const setValueAxisLabels = useCallback(
    <T extends keyof ValueAxis['labels']>(paramName: T, value: ValueAxis['labels'][T]) =>
      setValue('valueAxes', [
        {
          ...valueAxis,
          labels: {
            ...valueAxis.labels,
            [paramName]: value,
          },
        },
      ]),
    [valueAxis, setValue]
  );

  const setRotateLabels = useCallback(
    (paramName: 'rotate', value: boolean) =>
      setValueAxisLabels(paramName, value ? VERTICAL_ROTATION : 0),
    [setValueAxisLabels]
  );

  const setColor = useCallback((value) => setValueAxisLabels('color', value), [setValueAxisLabels]);

  return (
    <EuiPanel paddingSize="s">
      <EuiTitle size="xs">
        <h3>
          <FormattedMessage
            id="visTypeVislib.controls.heatmapOptions.labelsTitle"
            defaultMessage="Labels"
          />
        </h3>
      </EuiTitle>
      <EuiSpacer size="s" />

      <SwitchOption
        label={i18n.translate('visTypeVislib.controls.heatmapOptions.showLabelsTitle', {
          defaultMessage: 'Show labels',
        })}
        paramName="show"
        value={valueAxis.labels.show}
        setValue={setValueAxisLabels}
      />

      <SwitchOption
        disabled={!valueAxis.labels.show}
        label={i18n.translate('visTypeVislib.controls.heatmapOptions.rotateLabel', {
          defaultMessage: 'Rotate',
        })}
        paramName="rotate"
        value={rotateLabels}
        setValue={setRotateLabels}
      />

      <SwitchOption
        disabled={!valueAxis.labels.show}
        label={i18n.translate(
          'visTypeVislib.controls.heatmapOptions.overwriteAutomaticColorLabel',
          {
            defaultMessage: 'Overwrite automatic color',
          }
        )}
        paramName="overwriteColor"
        value={valueAxis.labels.overwriteColor}
        setValue={setValueAxisLabels}
      />

      <EuiFormRow
        display="rowCompressed"
        fullWidth
        label={i18n.translate('visTypeVislib.controls.heatmapOptions.colorLabel', {
          defaultMessage: 'Color',
        })}
      >
        <EuiColorPicker
          compressed
          fullWidth
          disabled={!valueAxis.labels.show || !valueAxis.labels.overwriteColor}
          color={valueAxis.labels.color}
          onChange={setColor}
        />
      </EuiFormRow>
    </EuiPanel>
  );
}

export { LabelsPanel };
