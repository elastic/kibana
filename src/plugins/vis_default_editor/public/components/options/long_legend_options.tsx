/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiFieldNumber, EuiFormRow } from '@elastic/eui';
import { SwitchOption } from './switch';

const MAX_TRUNCATE_LINES = 5;
const MIN_TRUNCATE_LINES = 1;

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
          min={MIN_TRUNCATE_LINES}
          max={MAX_TRUNCATE_LINES}
          fullWidth
          disabled={!Boolean(truncateLegend)}
          onChange={(e) => {
            const val = Number(e.target.value);
            setValue(
              'maxLegendLines',
              Math.min(MAX_TRUNCATE_LINES, Math.max(val, MIN_TRUNCATE_LINES))
            );
          }}
        />
      </EuiFormRow>
    </>
  );
}

export { LongLegendOptions };
