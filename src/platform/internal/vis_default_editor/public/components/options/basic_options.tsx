/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';

import { i18n } from '@kbn/i18n';

import { VisEditorOptionsProps } from '@kbn/visualizations-plugin/public';
import { SwitchOption } from './switch';
import { SelectOption } from './select';

interface BasicOptionsParams {
  addTooltip: boolean;
  legendPosition: string;
}

type LegendPositions = Array<{
  value: string;
  text: string;
}>;

function BasicOptions<VisParams extends BasicOptionsParams>({
  stateParams,
  setValue,
  legendPositions,
}: VisEditorOptionsProps<VisParams> & { legendPositions: LegendPositions }) {
  return (
    <>
      <SelectOption
        label={i18n.translate('visDefaultEditor.options.vislibBasicOptions.legendPositionLabel', {
          defaultMessage: 'Legend position',
        })}
        options={legendPositions}
        paramName="legendPosition"
        value={stateParams.legendPosition}
        setValue={setValue}
      />
      <SwitchOption
        label={i18n.translate('visDefaultEditor.options.vislibBasicOptions.showTooltipLabel', {
          defaultMessage: 'Show tooltip',
        })}
        paramName="addTooltip"
        value={stateParams.addTooltip}
        setValue={setValue}
      />
    </>
  );
}

export { BasicOptions };
