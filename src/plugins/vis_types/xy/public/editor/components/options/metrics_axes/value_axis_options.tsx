/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiSpacer, EuiAccordion, EuiHorizontalRule } from '@elastic/eui';

import { SelectOption, SwitchOption, TextInputOption } from '@kbn/vis-default-editor-plugin/public';

import { ValueAxis } from '../../../../types';
import { LabelOptions, SetAxisLabel } from './label_options';
import { CustomExtentsOptions } from './custom_extents_options';
import { SetParamByIndex } from '.';
import { getConfigCollections } from '../../../collections';

const collections = getConfigCollections();

export type SetScale = <T extends keyof ValueAxis['scale']>(
  paramName: T,
  value: ValueAxis['scale'][T]
) => void;

export interface ValueAxisOptionsParams {
  axis: ValueAxis;
  index: number;
  onValueAxisPositionChanged: (index: number, value: ValueAxis['position']) => void;
  setParamByIndex: SetParamByIndex;
  valueAxis: ValueAxis;
  setMultipleValidity: (paramName: string, isValid: boolean) => void;
}

export function ValueAxisOptions({
  axis,
  index,
  valueAxis,
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

  return (
    <>
      <SelectOption
        label={i18n.translate('visTypeXy.controls.pointSeries.valueAxes.positionLabel', {
          defaultMessage: 'Position',
        })}
        options={collections.positions}
        paramName="position"
        value={axis.position}
        setValue={onPositionChanged}
      />

      <SelectOption
        id={`valueAxisMode${index}`}
        label={i18n.translate('visTypeXy.controls.pointSeries.valueAxes.modeLabel', {
          defaultMessage: 'Mode',
        })}
        options={collections.axisModes}
        paramName="mode"
        value={axis.scale.mode}
        setValue={setValueAxisScale}
      />

      <SelectOption
        id={`scaleSelectYAxis-${axis.id}`}
        label={i18n.translate('visTypeXy.controls.pointSeries.valueAxes.scaleTypeLabel', {
          defaultMessage: 'Scale type',
        })}
        options={collections.scaleTypes}
        paramName="type"
        value={axis.scale.type}
        setValue={setValueAxisScale}
      />

      <EuiHorizontalRule margin="m" />

      <SwitchOption
        label={i18n.translate('visTypeXy.controls.pointSeries.valueAxes.showLabel', {
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
            label={i18n.translate('visTypeXy.controls.pointSeries.valueAxes.titleLabel', {
              defaultMessage: 'Title',
            })}
            paramName="text"
            value={axis.title.text}
            setValue={setValueAxisTitle}
          />

          <LabelOptions
            axisLabels={axis.labels}
            axisFilterCheckboxName={`yAxisFilterLabelsCheckbox-${axis.id}`}
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
          'visTypeXy.controls.pointSeries.valueAxes.customExtentsLabel',
          {
            defaultMessage: 'Custom extents',
          }
        )}
        aria-label={i18n.translate(
          'visTypeXy.controls.pointSeries.valueAxes.toggleCustomExtendsAriaLabel',
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
            disableAxisExtents={axis.scale.mode === 'percentage'}
          />
        </>
      </EuiAccordion>
    </>
  );
}
