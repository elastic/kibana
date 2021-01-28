/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React, { useCallback } from 'react';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiPanel, EuiTitle, EuiSpacer } from '@elastic/eui';
import { Position } from '@elastic/charts';

import { VisEditorOptionsProps } from 'src/plugins/visualizations/public';
import { SelectOption, SwitchOption } from '../../../../../../vis_default_editor/public';

import { LabelOptions, SetAxisLabel } from './label_options';
import { CategoryAxis } from '../../../../types';

export interface CategoryAxisPanelProps {
  axis: CategoryAxis;
  onPositionChanged: (position: Position) => void;
  setCategoryAxis: (value: CategoryAxis) => void;
  vis: VisEditorOptionsProps['vis'];
}

function CategoryAxisPanel({
  axis,
  onPositionChanged,
  vis,
  setCategoryAxis,
}: CategoryAxisPanelProps) {
  const setAxis = useCallback(
    <T extends keyof CategoryAxis>(paramName: T, value: CategoryAxis[T]) => {
      const updatedAxis = {
        ...axis,
        [paramName]: value,
      };
      setCategoryAxis(updatedAxis);
    },
    [setCategoryAxis, axis]
  );

  const setPosition = useCallback(
    (paramName: 'position', value: CategoryAxis['position']) => {
      setAxis(paramName, value);
      onPositionChanged(value);
    },
    [setAxis, onPositionChanged]
  );

  const setAxisLabel: SetAxisLabel = useCallback(
    (paramName, value) => {
      const labels = {
        ...axis.labels,
        [paramName]: value,
      };
      setAxis('labels', labels);
    },
    [axis.labels, setAxis]
  );

  return (
    <EuiPanel paddingSize="s">
      <EuiTitle size="xs">
        <h3>
          <FormattedMessage
            id="visTypeXy.controls.pointSeries.categoryAxis.xAxisTitle"
            defaultMessage="X-axis"
          />
        </h3>
      </EuiTitle>
      <EuiSpacer size="s" />

      <SelectOption
        label={i18n.translate('visTypeXy.controls.pointSeries.categoryAxis.positionLabel', {
          defaultMessage: 'Position',
        })}
        options={vis.type.editorConfig.collections.positions}
        paramName="position"
        value={axis.position}
        setValue={setPosition}
        data-test-subj="categoryAxisPosition"
      />

      <SwitchOption
        label={i18n.translate('visTypeXy.controls.pointSeries.categoryAxis.showLabel', {
          defaultMessage: 'Show axis lines and labels',
        })}
        paramName="show"
        value={axis.show}
        setValue={setAxis}
      />

      {axis.show && (
        <LabelOptions
          axisLabels={axis.labels}
          axisFilterCheckboxName={`xAxisFilterLabelsCheckbox${axis.id}`}
          setAxisLabel={setAxisLabel}
        />
      )}
    </EuiPanel>
  );
}

export { CategoryAxisPanel };
