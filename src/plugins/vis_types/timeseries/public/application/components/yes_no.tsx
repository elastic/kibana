/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useCallback } from 'react';
import { EuiRadio, htmlIdGenerator } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { TimeseriesVisParams } from '../../types';

interface YesNoProps {
  name: string;
  value: boolean | number | undefined;
  disabled?: boolean;
  'data-test-subj'?: string;
  onChange: (partialModel: Partial<TimeseriesVisParams>) => void;
}

export function YesNo({
  name,
  value,
  disabled,
  'data-test-subj': dataTestSubj,
  onChange,
}: YesNoProps) {
  const handleChange = useCallback(
    (val: number) => {
      return () => onChange({ [name]: val });
    },
    [onChange, name]
  );
  const htmlId = htmlIdGenerator();
  const inputName = htmlId(name);

  return (
    <div>
      <EuiRadio
        id={htmlId('yes')}
        data-test-subj={`${dataTestSubj}-yes`}
        label={
          <FormattedMessage
            id="visTypeTimeseries.yesButtonLabel"
            defaultMessage="Yes"
            description="The 'yes' in a yes/no answer choice."
          />
        }
        className="eui-displayInlineBlock"
        name={inputName}
        checked={Boolean(value)}
        value="yes"
        onChange={handleChange(1)}
        disabled={disabled}
      />
      &emsp;
      <EuiRadio
        id={htmlId('no')}
        data-test-subj={`${dataTestSubj}-no`}
        label={
          <FormattedMessage
            id="visTypeTimeseries.noButtonLabel"
            defaultMessage="No"
            description="The 'no' in a yes/no answer choice."
          />
        }
        className="eui-displayInlineBlock"
        name={inputName}
        checked={!Boolean(value)}
        value="no"
        onChange={handleChange(0)}
        disabled={disabled}
      />
    </div>
  );
}
