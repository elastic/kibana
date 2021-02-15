/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useCallback } from 'react';

import { EuiPanel, EuiTitle, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';

import { VisOptionsProps } from 'src/plugins/vis_default_editor/public';
import { Axis } from '../../../types';
import { SelectOption, SwitchOption } from '../../../../../charts/public';
import { LabelOptions, SetAxisLabel } from './label_options';
import { Positions } from '../../../utils/collections';

export interface CategoryAxisPanelProps {
  axis: Axis;
  onPositionChanged: (position: Positions) => void;
  setCategoryAxis: (value: Axis) => void;
  vis: VisOptionsProps['vis'];
}

function CategoryAxisPanel({
  axis,
  onPositionChanged,
  vis,
  setCategoryAxis,
}: CategoryAxisPanelProps) {
  const setAxis = useCallback(
    <T extends keyof Axis>(paramName: T, value: Axis[T]) => {
      const updatedAxis = {
        ...axis,
        [paramName]: value,
      };
      setCategoryAxis(updatedAxis);
    },
    [setCategoryAxis, axis]
  );

  const setPosition = useCallback(
    (paramName: 'position', value: Axis['position']) => {
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
            id="visTypeVislib.controls.pointSeries.categoryAxis.xAxisTitle"
            defaultMessage="X-axis"
          />
        </h3>
      </EuiTitle>
      <EuiSpacer size="s" />

      <SelectOption
        label={i18n.translate('visTypeVislib.controls.pointSeries.categoryAxis.positionLabel', {
          defaultMessage: 'Position',
        })}
        options={vis.type.editorConfig.collections.positions}
        paramName="position"
        value={axis.position}
        setValue={setPosition}
        data-test-subj="categoryAxisPosition"
      />

      <SwitchOption
        label={i18n.translate('visTypeVislib.controls.pointSeries.categoryAxis.showLabel', {
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
