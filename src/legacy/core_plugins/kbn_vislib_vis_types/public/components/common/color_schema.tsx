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

import React, { useEffect, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiLink, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';

import { VisOptionsProps, ColorSchema } from '../../legacy_imports';
import { SelectOption } from './select';
import { SwitchOption } from './switch';
import { ColorSchemaVislibParams } from '../../types';

export type SetColorSchemaOptionsValue = <T extends keyof ColorSchemaVislibParams>(
  paramName: T,
  value: ColorSchemaVislibParams[T]
) => void;

interface ColorSchemaOptionsProps extends ColorSchemaVislibParams {
  disabled?: boolean;
  colorSchemas: ColorSchema[];
  uiState: VisOptionsProps['uiState'];
  setValue: SetColorSchemaOptionsValue;
  showHelpText?: boolean;
}

function ColorSchemaOptions({
  disabled,
  colorSchema,
  colorSchemas,
  invertColors,
  uiState,
  setValue,
  showHelpText = true,
}: ColorSchemaOptionsProps) {
  const [isCustomColors, setIsCustomColors] = useState(() => !!uiState.get('vis.colors'));

  useEffect(() => {
    uiState.on('colorChanged', () => {
      setIsCustomColors(true);
    });
  }, [uiState]);

  const resetColorsButton = (
    <EuiText size="xs">
      <EuiLink
        onClick={() => {
          uiState.set('vis.colors', null);
          setIsCustomColors(false);
        }}
      >
        <FormattedMessage
          id="kbnVislibVisTypes.controls.colorSchema.resetColorsButtonLabel"
          defaultMessage="Reset colors"
        />
      </EuiLink>
    </EuiText>
  );

  return (
    <>
      <SelectOption
        disabled={disabled}
        helpText={
          showHelpText &&
          i18n.translate('kbnVislibVisTypes.controls.colorSchema.howToChangeColorsDescription', {
            defaultMessage: 'Individual colors can be changed in the legend.',
          })
        }
        label={i18n.translate('kbnVislibVisTypes.controls.colorSchema.colorSchemaLabel', {
          defaultMessage: 'Color schema',
        })}
        labelAppend={isCustomColors && resetColorsButton}
        options={colorSchemas}
        paramName="colorSchema"
        value={colorSchema}
        setValue={setValue}
      />

      <SwitchOption
        disabled={disabled}
        label={i18n.translate('kbnVislibVisTypes.controls.colorSchema.reverseColorSchemaLabel', {
          defaultMessage: 'Reverse schema',
        })}
        paramName="invertColors"
        value={invertColors}
        setValue={setValue}
      />
    </>
  );
}

export { ColorSchemaOptions };
