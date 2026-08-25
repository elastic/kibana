/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiButtonGroup, EuiFormRow } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useState } from 'react';

interface TextDecorationConfig {
  textVisibility?: boolean;
  textField?: string;
}

function getSelectedOption(
  { textField, textVisibility }: TextDecorationConfig = {},
  isQueryBased?: boolean
) {
  if (!textVisibility) {
    return 'none';
  }
  if (isQueryBased && textField) {
    return 'field';
  }
  return 'name';
}

export function TextDecorationSetting({
  idPrefix,
  currentConfig,
  setConfig,
  isQueryBased,
  children,
}: {
  idPrefix: string;
  currentConfig?: TextDecorationConfig;
  setConfig: (config: TextDecorationConfig) => void;
  isQueryBased?: boolean;
  /** A children render function for custom sub fields on textDecoration change */
  children?: (textDecoration: 'none' | 'name' | 'field') => JSX.Element | null;
}) {
  // To model the temporary state for label based on field when user didn't pick up the field yet,
  // use a local state
  const [selectedVisibleOption, setVisibleOption] = useState<'none' | 'name' | 'field'>(
    getSelectedOption(currentConfig, isQueryBased)
  );
  const options = [
    {
      id: `${idPrefix}none`,
      label: i18n.translate('visualizationUiComponents.xyChart.lineMarker.textVisibility.none', {
        defaultMessage: 'None',
      }),
      'data-test-subj': 'lnsXY_textVisibility_none',
    },
    {
      id: `${idPrefix}name`,
      label: i18n.translate('visualizationUiComponents.xyChart.lineMarker.textVisibility.name', {
        defaultMessage: 'Name',
      }),
      'data-test-subj': 'lnsXY_textVisibility_name',
    },
  ];
  if (isQueryBased) {
    options.push({
      id: `${idPrefix}field`,
      label: i18n.translate('visualizationUiComponents.xyChart.lineMarker.textVisibility.field', {
        defaultMessage: 'Field',
      }),
      'data-test-subj': 'lnsXY_textVisibility_field',
    });
  }

  return (
    <EuiFormRow
      label={i18n.translate('visualizationUiComponents.lineMarker.textVisibility', {
        defaultMessage: 'Text decoration',
      })}
      display="columnCompressed"
      fullWidth
    >
      <div>
        <EuiButtonGroup
          legend={i18n.translate('visualizationUiComponents.lineMarker.textVisibility', {
            defaultMessage: 'Text decoration',
          })}
          data-test-subj="lns-lineMarker-text-visibility"
          name="textVisibilityStyle"
          buttonSize="compressed"
          options={options}
          idSelected={
            selectedVisibleOption ? `${idPrefix}${selectedVisibleOption}` : `${idPrefix}none`
          }
          onChange={(id) => {
            const chosenOption = id.replace(idPrefix, '') as 'none' | 'name' | 'field';
            if (chosenOption === 'none') {
              setConfig({
                textVisibility: false,
                textField: undefined,
              });
            } else if (chosenOption === 'name') {
              setConfig({
                textVisibility: true,
                textField: undefined,
              });
            } else if (chosenOption === 'field') {
              setConfig({
                textVisibility: Boolean(currentConfig?.textField),
              });
            }

            setVisibleOption(chosenOption);
          }}
          isFullWidth
        />
        {children?.(selectedVisibleOption)}
      </div>
    </EuiFormRow>
  );
}
