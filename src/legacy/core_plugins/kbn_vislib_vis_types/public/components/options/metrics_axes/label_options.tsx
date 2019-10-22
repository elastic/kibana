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

import React, { useCallback, useMemo } from 'react';
import { EuiTitle, EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';

import { VisOptionsProps } from 'ui/vis/editors/default';
import { BasicVislibParams, Axis } from '../../../types';
import { SelectOption, SwitchOption, TruncateLabelsOption } from '../../common';
import { getRotateOptions } from '../../../utils/collections';

export interface LabelOptionsProps extends VisOptionsProps<BasicVislibParams> {
  axis: Axis;
  axesName: 'categoryAxes' | 'valueAxes';
  index: number;
}

function LabelOptions({ stateParams, setValue, axis, axesName, index }: LabelOptionsProps) {
  const setAxisLabel = useCallback(
    <T extends keyof Axis['labels']>(paramName: T, value: Axis['labels'][T]) => {
      const axes = [...stateParams[axesName]];
      axes[index] = {
        ...axes[index],
        labels: {
          ...axes[index].labels,
          [paramName]: value,
        },
      };
      setValue(axesName, axes);
    },
    [axesName, index, setValue, stateParams]
  );

  const setAxisLabelRotate = useCallback(
    (paramName: 'rotate', value: Axis['labels']['rotate']) => {
      setAxisLabel(paramName, Number(value));
    },
    [setAxisLabel]
  );

  const rotateOptions = useMemo(getRotateOptions, []);

  return (
    <>
      <EuiSpacer size="m" />
      <EuiTitle size="xxs">
        <h3>
          <FormattedMessage
            id="kbnVislibVisTypes.controls.pointSeries.categoryAxis.labelsTitle"
            defaultMessage="Labels"
          />
        </h3>
      </EuiTitle>
      <EuiSpacer size="s" />

      <SwitchOption
        label={i18n.translate(
          'kbnVislibVisTypes.controls.pointSeries.categoryAxis.showLabelsLabel',
          {
            defaultMessage: 'Show labels',
          }
        )}
        paramName="show"
        value={axis.labels.show}
        setValue={setAxisLabel}
      />

      <SwitchOption
        data-test-subj={`${axesName === 'valueAxes' ? 'y' : 'x'}AxisFilterLabelsCheckbox-${
          axis.id
        }`}
        disabled={!axis.labels.show}
        label={i18n.translate(
          'kbnVislibVisTypes.controls.pointSeries.categoryAxis.filterLabelsLabel',
          {
            defaultMessage: 'Filter labels',
          }
        )}
        paramName="filter"
        value={axis.labels.filter}
        setValue={setAxisLabel}
      />

      <EuiSpacer size="m" />

      <EuiFlexGroup gutterSize="s">
        <EuiFlexItem>
          <SelectOption
            disabled={!axis.labels.show}
            label={i18n.translate(
              'kbnVislibVisTypes.controls.pointSeries.categoryAxis.alignLabel',
              {
                defaultMessage: 'Align',
              }
            )}
            options={rotateOptions}
            paramName="rotate"
            value={axis.labels.rotate}
            setValue={setAxisLabelRotate}
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <TruncateLabelsOption
            disabled={!axis.labels.show}
            value={axis.labels.truncate}
            setValue={setAxisLabel}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
}

export { LabelOptions };
