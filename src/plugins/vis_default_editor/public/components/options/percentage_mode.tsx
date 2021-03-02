/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiFieldText, EuiFormRow, EuiLink } from '@elastic/eui';
import { SwitchOption } from './switch';
import { useKibana } from '../../../../kibana_react/public';
import { UI_SETTINGS } from '../../../../data/public';

export interface PercentageModeOptionProps {
  setValue: (
    paramName: 'percentageMode' | 'percentageFormatPattern',
    value: boolean | string | undefined
  ) => void;
  percentageMode: boolean;
  formatPattern?: string;
  'data-test-subj'?: string;
}

function PercentageModeOption({
  'data-test-subj': dataTestSubj,
  setValue,
  percentageMode,
  formatPattern,
}: PercentageModeOptionProps) {
  const { services } = useKibana();
  const defaultPattern = services.uiSettings?.get(UI_SETTINGS.FORMAT_PERCENT_DEFAULT_PATTERN);

  return (
    <>
      <SwitchOption
        data-test-subj={dataTestSubj}
        label={i18n.translate('visDefaultEditor.options.percentageMode.percentageModeLabel', {
          defaultMessage: 'Percentage mode',
        })}
        paramName="percentageMode"
        value={percentageMode}
        setValue={setValue}
      />
      <EuiFormRow
        fullWidth
        label={
          <FormattedMessage
            id="visDefaultEditor.options.percentageMode.numeralLabel"
            defaultMessage="Format pattern"
          />
        }
        helpText={
          <EuiLink target="_blank" href="https://adamwdraper.github.io/Numeral-js/">
            <FormattedMessage
              id="visDefaultEditor.options.percentageMode.documentationLabel"
              defaultMessage="Numeral.js documentation"
            />
          </EuiLink>
        }
      >
        <EuiFieldText
          fullWidth
          compressed
          data-test-subj={`${dataTestSubj}FormatPattern`}
          value={formatPattern || ''}
          placeholder={defaultPattern}
          onChange={(e) => {
            setValue('percentageFormatPattern', e.target.value ? e.target.value : undefined);
          }}
          disabled={!percentageMode}
        />
      </EuiFormRow>
    </>
  );
}

export { PercentageModeOption };
