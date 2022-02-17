/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useCallback } from 'react';

import { EuiColorPicker, EuiFormRow, EuiPanel, EuiSpacer, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import { VisEditorOptionsProps } from 'src/plugins/visualizations/public';
import { SwitchOption } from '../../../../../vis_default_editor/public';
import { HeatmapVisParams, ValueAxis } from '../../types';

const VERTICAL_ROTATION = 270;

interface LabelsPanelProps {
  valueAxis: ValueAxis;
  setValue: VisEditorOptionsProps<HeatmapVisParams>['setValue'];
  isNewLibrary?: boolean;
}

function LabelsPanel({ valueAxis, setValue, isNewLibrary }: LabelsPanelProps) {
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
            id="visTypeHeatmap.controls.heatmapOptions.labelsTitle"
            defaultMessage="Labels"
          />
        </h3>
      </EuiTitle>
      <EuiSpacer size="s" />

      <SwitchOption
        label={i18n.translate('visTypeHeatmap.controls.heatmapOptions.showLabelsTitle', {
          defaultMessage: 'Show labels',
        })}
        paramName="show"
        value={Boolean(valueAxis.labels.show)}
        setValue={setValueAxisLabels}
      />

      <SwitchOption
        disabled={!valueAxis.labels.show || isNewLibrary}
        label={i18n.translate('visTypeHeatmap.controls.heatmapOptions.rotateLabel', {
          defaultMessage: 'Rotate',
        })}
        data-test-subj="heatmapLabelsRotate"
        paramName="rotate"
        value={rotateLabels}
        setValue={setRotateLabels}
        tooltip={i18n.translate('visTypeHeatmap.editors.heatmap.rotateLabelNotAvailable', {
          defaultMessage:
            'Rotate label is not supported with the new charts library. Please enable the heatmap legacy charts library advanced setting.',
        })}
      />

      <SwitchOption
        disabled={!valueAxis.labels.show || isNewLibrary}
        label={i18n.translate(
          'visTypeHeatmap.controls.heatmapOptions.overwriteAutomaticColorLabel',
          {
            defaultMessage: 'Overwrite automatic color',
          }
        )}
        paramName="overwriteColor"
        value={Boolean(valueAxis.labels.overwriteColor)}
        setValue={setValueAxisLabels}
        data-test-subj="heatmapLabelsOverwriteColor"
        tooltip={i18n.translate('visTypeHeatmap.editors.heatmap.overwriteColorlNotAvailable', {
          defaultMessage:
            'Overwrite automatic color is not supported with the new charts library. Please enable the heatmap legacy charts library advanced setting .',
        })}
      />

      <EuiFormRow
        display="rowCompressed"
        fullWidth
        label={i18n.translate('visTypeHeatmap.controls.heatmapOptions.colorLabel', {
          defaultMessage: 'Color',
        })}
      >
        <EuiColorPicker
          compressed
          fullWidth
          data-test-subj="heatmapLabelsColor"
          disabled={!valueAxis.labels.show || !valueAxis.labels.overwriteColor || isNewLibrary}
          color={valueAxis.labels.color}
          onChange={setColor}
        />
      </EuiFormRow>
    </EuiPanel>
  );
}

export { LabelsPanel };
