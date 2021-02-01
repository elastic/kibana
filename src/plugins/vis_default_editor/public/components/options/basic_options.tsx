/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React from 'react';

import { i18n } from '@kbn/i18n';

import { VisEditorOptionsProps } from '../../../../visualizations/public';
import { SwitchOption } from './switch';
import { SelectOption } from './select';

interface BasicOptionsParams {
  addTooltip: boolean;
  legendPosition: string;
}

interface Collections {
  legendPositions: Array<{
    value: string;
    text: string;
  }>;
  [key: string]: any;
}

function BasicOptions<VisParams extends BasicOptionsParams>({
  stateParams,
  setValue,
  collections,
}: VisEditorOptionsProps<VisParams> & { collections: Collections }) {
  return (
    <>
      <SelectOption
        label={i18n.translate('visDefaultEditor.options.vislibBasicOptions.legendPositionLabel', {
          defaultMessage: 'Legend position',
        })}
        options={collections.legendPositions}
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
