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

import React, { useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiSpacer, EuiAccordion } from '@elastic/eui';

import { VisOptionsProps } from 'ui/vis/editors/default';
import { BasicVislibParams, ValueAxis } from '../../../types';
import { ChartTypes } from '../../../utils/collections';
import { SelectOption } from '../../select';
import { LineOptions } from './../line_options';
import { SwitchOption } from './../../switch';
import { TextInputOption } from './../../text_input';
import { LabelOptions } from './label_options';
import { ValueAxisCustomOptions } from './value_axis_custom_options';

export interface ValueAxisOptionsParams extends VisOptionsProps<BasicVislibParams> {
  axis: ValueAxis;
  index: number;
}

function ValueAxisOptions(props: ValueAxisOptionsParams) {
  const { stateParams, setValue, vis, axis, index } = props;

  const setValueAxis = <T extends keyof ValueAxis>(paramName: T, value: ValueAxis[T]) => {
    const valueAxes = [...stateParams.valueAxes];

    valueAxes[index] = {
      ...valueAxes[index],
      [paramName]: value,
    };
    setValue('valueAxes', valueAxes);
  };

  const setValueAxisTitle = <T extends keyof ValueAxis['title']>(
    paramName: T,
    value: ValueAxis['title'][T]
  ) => {
    const valueAxes = [...stateParams.valueAxes];

    valueAxes[index] = {
      ...valueAxes[index],
      title: {
        ...valueAxes[index].title,
        [paramName]: value,
      },
    };
    setValue('valueAxes', valueAxes);
  };

  const setValueAxisScale = <T extends keyof ValueAxis['scale']>(
    paramName: T,
    value: ValueAxis['scale'][T]
  ) => {
    const valueAxes = [...stateParams.valueAxes];

    valueAxes[index] = {
      ...valueAxes[index],
      scale: {
        ...valueAxes[index].scale,
        [paramName]: value,
      },
    };
    setValue('valueAxes', valueAxes);
  };

  const isPositionDisabled = position => {
    if ('isCategoryAxisHorizontal') {
      return ['top', 'bottom'].includes(position);
    }
    return ['left', 'right'].includes(position);
  };

  const positions = vis.type.editorConfig.collections.positions.map(position => ({
    ...position,
    disabled: isPositionDisabled(position.value),
  }));

  return (
    <>
      <SwitchOption
        label={i18n.translate('kbnVislibVisTypes.controls.pointSeries.valueAxes.showLabel', {
          defaultMessage: 'Show',
        })}
        paramName="show"
        value={axis.show}
        setValue={setValueAxis}
      />

      <TextInputOption
        id={`valueAxisTitle${index}`}
        label={i18n.translate('kbnVislibVisTypes.controls.pointSeries.valueAxes.titleLabel', {
          defaultMessage: 'Title',
        })}
        paramName="text"
        value={axis.title.text}
        setValue={setValueAxisTitle}
      />

      <SelectOption
        id={`valueAxisPosition${index}`}
        label={i18n.translate('kbnVislibVisTypes.controls.pointSeries.valueAxes.positionLabel', {
          defaultMessage: 'Position',
        })}
        options={positions}
        paramName="position"
        value={axis.position}
        setValue={setValueAxis}
      />

      <SelectOption
        id={`valueAxisMode${index}`}
        label={i18n.translate('kbnVislibVisTypes.controls.pointSeries.valueAxes.modeLabel', {
          defaultMessage: 'Mode',
        })}
        options={vis.type.editorConfig.collections.axisModes}
        paramName="mode"
        value={axis.scale.mode}
        setValue={setValueAxisScale}
      />

      <SelectOption
        id={`scaleSelectYAxis-${axis.id}`}
        label={i18n.translate('kbnVislibVisTypes.controls.pointSeries.valueAxes.scaleTypeLabel', {
          defaultMessage: 'Scale type',
        })}
        options={vis.type.editorConfig.collections.scaleTypes}
        paramName="type"
        value={axis.scale.type}
        setValue={setValueAxisScale}
      />

      <EuiAccordion
        id="visEditorValueAxisAccordion"
        className="visEditorSidebar__section visEditorSidebar__collapsible"
        initialIsOpen={false}
        buttonContent={i18n.translate(
          'kbnVislibVisTypes.controls.pointSeries.valueAxes.advancedOptionsLabel',
          {
            defaultMessage: 'Advanced options',
          }
        )}
        aria-label={i18n.translate(
          'kbnVislibVisTypes.controls.pointSeries.valueAxes.toggleAdvancedOptionsLabel',
          {
            defaultMessage: 'Toggle advanced options',
          }
        )}
      >
        <>
          <EuiSpacer size="m" />
          <LabelOptions axis={axis} axisName="valueAxes" {...props} />
          <ValueAxisCustomOptions axis={axis} {...props} setValue={setValueAxisScale} />
        </>
      </EuiAccordion>
    </>
  );
}

export { ValueAxisOptions };
