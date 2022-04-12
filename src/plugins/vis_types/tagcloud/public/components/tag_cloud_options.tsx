/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useState, useEffect } from 'react';
import { EuiPanel } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { PaletteRegistry } from '@kbn/coloring';
import { VisEditorOptionsProps } from '../../../../visualizations/public';
import { SelectOption, SwitchOption, PalettePicker } from '../../../../vis_default_editor/public';
import { ValidatedDualRange } from '../../../../kibana_react/public';
import { TagCloudVisParams, TagCloudTypeProps } from '../types';
import { collections } from './collections';

interface TagCloudOptionsProps
  extends VisEditorOptionsProps<TagCloudVisParams>,
    TagCloudTypeProps {}

function TagCloudOptions({ stateParams, setValue, palettes }: TagCloudOptionsProps) {
  const [palettesRegistry, setPalettesRegistry] = useState<PaletteRegistry | undefined>(undefined);
  const handleFontSizeChange = ([minFontSize, maxFontSize]: [string | number, string | number]) => {
    setValue('minFontSize', Number(minFontSize));
    setValue('maxFontSize', Number(maxFontSize));
  };
  const fontSizeRangeLabel = i18n.translate('visTypeTagCloud.visParams.fontSizeLabel', {
    defaultMessage: 'Font size range in pixels',
  });

  useEffect(() => {
    const fetchPalettes = async () => {
      const palettesService = await palettes?.getPalettes();
      setPalettesRegistry(palettesService);
    };
    fetchPalettes();
  }, [palettes]);

  return (
    <EuiPanel paddingSize="s">
      <SelectOption
        label={i18n.translate('visTypeTagCloud.visParams.textScaleLabel', {
          defaultMessage: 'Text scale',
        })}
        options={collections.scales}
        paramName="scale"
        value={stateParams.scale}
        setValue={setValue}
      />

      {palettesRegistry && (
        <PalettePicker
          palettes={palettesRegistry}
          activePalette={stateParams.palette}
          paramName="palette"
          setPalette={(paramName, value) => {
            setValue(paramName, value);
          }}
        />
      )}

      <SelectOption
        label={i18n.translate('visTypeTagCloud.visParams.orientationsLabel', {
          defaultMessage: 'Orientations',
        })}
        options={collections.orientations}
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

// default export required for React.Lazy
// eslint-disable-next-line import/no-default-export
export { TagCloudOptions as default };
