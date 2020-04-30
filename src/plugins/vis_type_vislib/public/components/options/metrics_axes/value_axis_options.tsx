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
import { i18n } from '@kbn/i18n';
import { EuiSpacer, EuiAccordion, EuiHorizontalRule } from '@elastic/eui';

import { Vis } from '../../../../../visualizations/public';
import { ValueAxis } from '../../../types';
import { Positions } from '../../../utils/collections';
import { SelectOption, SwitchOption, TextInputOption } from '../../../../../charts/public';
import { LabelOptions, SetAxisLabel } from './label_options';
import { CustomExtentsOptions } from './custom_extents_options';
import { isAxisHorizontal } from './utils';
import { SetParamByIndex } from '.';

export type SetScale = <T extends keyof ValueAxis['scale']>(
  paramName: T,
  value: ValueAxis['scale'][T]
) => void;

export interface ValueAxisOptionsParams {
  axis: ValueAxis;
  index: number;
  isCategoryAxisHorizontal: boolean;
  onValueAxisPositionChanged: (index: number, value: ValueAxis['position']) => void;
  setParamByIndex: SetParamByIndex;
  valueAxis: ValueAxis;
  vis: Vis;
  setMultipleValidity: (paramName: string, isValid: boolean) => void;
}

function ValueAxisOptions({
  axis,
  index,
  isCategoryAxisHorizontal,
  valueAxis,
  vis,
  onValueAxisPositionChanged,
  setParamByIndex,
  setMultipleValidity,
}: ValueAxisOptionsParams) {
  const setValueAxis = useCallback(
    <T extends keyof ValueAxis>(paramName: T, value: ValueAxis[T]) =>
      setParamByIndex('valueAxes', index, paramName, value),
    [setParamByIndex, index]
  );

  const setValueAxisTitle = useCallback(
    <T extends keyof ValueAxis['title']>(paramName: T, value: ValueAxis['title'][T]) => {
      const title = {
        ...valueAxis.title,
        [paramName]: value,
      };

      setParamByIndex('valueAxes', index, 'title', title);
    },
    [valueAxis.title, setParamByIndex, index]
  );

  const setValueAxisScale: SetScale = useCallback(
    (paramName, value) => {
      const scale = {
        ...valueAxis.scale,
        [paramName]: value,
      };

      setParamByIndex('valueAxes', index, 'scale', scale);
    },
    [valueAxis.scale, setParamByIndex, index]
  );

  const setAxisLabel: SetAxisLabel = useCallback(
    (paramName, value) => {
      const labels = {
        ...valueAxis.labels,
        [paramName]: value,
      };

      setParamByIndex('valueAxes', index, 'labels', labels);
    },
    [valueAxis.labels, setParamByIndex, index]
  );

  const onPositionChanged = useCallback(
    (paramName: 'position', value: ValueAxis['position']) => {
      onValueAxisPositionChanged(index, value);
    },
    [index, onValueAxisPositionChanged]
  );

  const isPositionDisabled = useCallback(
    (position: Positions) => {
      if (isCategoryAxisHorizontal) {
        return isAxisHorizontal(position);
      }
      return [Positions.LEFT, Positions.RIGHT].includes(position as any);
    },
    [isCategoryAxisHorizontal]
  );

  const positions = useMemo(
    () =>
      vis.type.editorConfig.collections.positions.map(
        (position: { text: string; value: Positions }) => ({
          ...position,
          disabled: isPositionDisabled(position.value),
        })
      ),
    [vis.type.editorConfig.collections.positions, isPositionDisabled]
  );

  return (
    <>
      <SelectOption
        label={i18n.translate('visTypeVislib.controls.pointSeries.valueAxes.positionLabel', {
          defaultMessage: 'Position',
        })}
        options={positions}
        paramName="position"
        value={axis.position}
        setValue={onPositionChanged}
      />

      <SelectOption
        id={`valueAxisMode${index}`}
        label={i18n.translate('visTypeVislib.controls.pointSeries.valueAxes.modeLabel', {
          defaultMessage: 'Mode',
        })}
        options={vis.type.editorConfig.collections.axisModes}
        paramName="mode"
        value={axis.scale.mode}
        setValue={setValueAxisScale}
      />

      <SelectOption
        id={`scaleSelectYAxis-${axis.id}`}
        label={i18n.translate('visTypeVislib.controls.pointSeries.valueAxes.scaleTypeLabel', {
          defaultMessage: 'Scale type',
        })}
        options={vis.type.editorConfig.collections.scaleTypes}
        paramName="type"
        value={axis.scale.type}
        setValue={setValueAxisScale}
      />

      <EuiHorizontalRule margin="m" />

      <SwitchOption
        label={i18n.translate('visTypeVislib.controls.pointSeries.valueAxes.showLabel', {
          defaultMessage: 'Show axis lines and labels',
        })}
        data-test-subj={`valueAxisShow-${axis.id}`}
        paramName="show"
        value={axis.show}
        setValue={setValueAxis}
      />

      {axis.show ? (
        <>
          <EuiSpacer size="m" />
          <TextInputOption
            data-test-subj={`valueAxisTitle${index}`}
            label={i18n.translate('visTypeVislib.controls.pointSeries.valueAxes.titleLabel', {
              defaultMessage: 'Title',
            })}
            paramName="text"
            value={axis.title.text}
            setValue={setValueAxisTitle}
          />

          <LabelOptions
            axisLabels={axis.labels}
            axisFilterCheckboxName={`yAxisFilterLabelsCheckbox${axis.id}`}
            setAxisLabel={setAxisLabel}
          />
        </>
      ) : (
        <EuiSpacer size="xs" />
      )}

      <EuiHorizontalRule margin="s" />

      <EuiAccordion
        id={`yAxisOptionsAccordion${axis.id}`}
        className="visEditorSidebar__section visEditorSidebar__collapsible"
        initialIsOpen={false}
        buttonContentClassName="euiText euiText--small"
        buttonContent={i18n.translate(
          'visTypeVislib.controls.pointSeries.valueAxes.customExtentsLabel',
          {
            defaultMessage: 'Custom extents',
          }
        )}
        aria-label={i18n.translate(
          'visTypeVislib.controls.pointSeries.valueAxes.toggleCustomExtendsAriaLabel',
          {
            defaultMessage: 'Toggle custom extents',
          }
        )}
      >
        <>
          <EuiSpacer size="m" />
          <CustomExtentsOptions
            axisScale={axis.scale}
            setMultipleValidity={setMultipleValidity}
            setValueAxisScale={setValueAxisScale}
            setValueAxis={setValueAxis}
          />
        </>
      </EuiAccordion>
    </>
  );
}

export { ValueAxisOptions };
