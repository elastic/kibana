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
import { EuiFieldNumber, EuiFormRow } from '@elastic/eui';
import { SwitchOption } from './switch';

export interface LongLegendOptionsProps {
  setValue: (paramName: 'maxLegendLines' | 'truncateLegend', value: boolean | number) => void;
  truncateLegend: boolean;
  maxLegendLines?: number;
  'data-test-subj'?: string;
}

function LongLegendOptions({
  'data-test-subj': dataTestSubj,
  setValue,
  truncateLegend,
  maxLegendLines,
}: LongLegendOptionsProps) {
  return (
    <>
      <SwitchOption
        data-test-subj={dataTestSubj}
        label={i18n.translate('visDefaultEditor.options.longLegends.truncateLegendTextLabel', {
          defaultMessage: 'Truncate legend text',
        })}
        paramName="truncateLegend"
        value={truncateLegend}
        setValue={setValue}
      />
      <EuiFormRow
        fullWidth
        label={
          <FormattedMessage
            id="visDefaultEditor.options.longLegends.maxLegendLinesLabel"
            defaultMessage="Maximum legend lines"
          />
        }
      >
        <EuiFieldNumber
          data-test-subj="timeSeriesEditorDataMaxLegendLines"
          value={maxLegendLines}
          min={1}
          max={5}
          fullWidth
          disabled={!Boolean(truncateLegend)}
          onChange={(e) => {
            setValue('maxLegendLines', Number(e.target.value));
          }}
        />
      </EuiFormRow>
    </>
  );
}

export { LongLegendOptions };
