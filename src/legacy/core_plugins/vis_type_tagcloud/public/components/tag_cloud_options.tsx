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

import React from 'react';
import { EuiPanel } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { VisOptionsProps } from '../../../vis_default_editor/public';
import { SelectOption, SwitchOption } from '../../../vis_type_vislib/public';
import { TagCloudVisParams } from '../types';
import { ValidatedDualRange } from '../legacy_imports';

function TagCloudOptions({ stateParams, setValue, vis }: VisOptionsProps<TagCloudVisParams>) {
  const handleFontSizeChange = ([minFontSize, maxFontSize]: [string | number, string | number]) => {
    setValue('minFontSize', Number(minFontSize));
    setValue('maxFontSize', Number(maxFontSize));
  };
  const fontSizeRangeLabel = i18n.translate('visTypeTagCloud.visParams.fontSizeLabel', {
    defaultMessage: 'Font size range in pixels',
  });

  return (
    <EuiPanel paddingSize="s">
      <SelectOption
        label={i18n.translate('visTypeTagCloud.visParams.textScaleLabel', {
          defaultMessage: 'Text scale',
        })}
        options={vis.type.editorConfig.collections.scales}
        paramName="scale"
        value={stateParams.scale}
        setValue={setValue}
      />

      <SelectOption
        label={i18n.translate('visTypeTagCloud.visParams.orientationsLabel', {
          defaultMessage: 'Orientations',
        })}
        options={vis.type.editorConfig.collections.orientations}
        paramName="orientation"
        value={stateParams.orientation}
        setValue={setValue}
      />

      <ValidatedDualRange
        allowEmptyRange={false}
        aria-label={fontSizeRangeLabel}
        compressed={true}
        fullWidth={true}
        label={fontSizeRangeLabel}
        max={100}
        min={1}
        value={[stateParams.minFontSize, stateParams.maxFontSize]}
        onChange={handleFontSizeChange}
        showInput
      />

      <SwitchOption
        label={i18n.translate('visTypeTagCloud.visParams.showLabelToggleLabel', {
          defaultMessage: 'Show label',
        })}
        paramName="showLabel"
        value={stateParams.showLabel}
        setValue={setValue}
      />
    </EuiPanel>
  );
}

export { TagCloudOptions };
