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

import React, { useCallback } from 'react';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiPanel, EuiTitle, EuiSpacer } from '@elastic/eui';
import { Position } from '@elastic/charts';

import { SelectOption, SwitchOption } from '../../../../../../charts/public';
import { VisOptionsProps } from '../../../../../../vis_default_editor/public';

import { LabelOptions, SetAxisLabel } from './label_options';
import { CategoryAxis } from '../../../../types';

export interface CategoryAxisPanelProps {
  axis: CategoryAxis;
  onPositionChanged: (position: Position) => void;
  setCategoryAxis: (value: CategoryAxis) => void;
  vis: VisOptionsProps['vis'];
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
