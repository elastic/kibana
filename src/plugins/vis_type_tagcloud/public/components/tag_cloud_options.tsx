/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React from 'react';
import { EuiPanel } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { VisOptionsProps, SelectOption, SwitchOption } from '../../../vis_default_editor/public';
import { ValidatedDualRange } from '../../../kibana_react/public';
import { TagCloudVisParams } from '../types';

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
