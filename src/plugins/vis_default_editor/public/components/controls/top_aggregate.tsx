/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useEffect, useRef } from 'react';
import { EuiFormRow, EuiIconTip, EuiSelect } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import {
  IAggConfig,
  AggParam,
  OptionedValueProp,
  OptionedParamType,
} from '@kbn/data-plugin/public';
import { AggParamEditorProps, OptionedParamEditorProps } from '../agg_param_props';

export interface AggregateValueProp extends OptionedValueProp {
  isCompatible(aggConfig: IAggConfig): boolean;
}

export type TopAggregateParamEditorProps = AggParamEditorProps<AggregateValueProp> &
  OptionedParamEditorProps<AggregateValueProp>;

export function getCompatibleAggs(agg: IAggConfig): AggregateValueProp[] {
  const { options = [] } = agg
    .getAggParams()
    .find(({ name }: AggParam) => name === 'aggregate') as OptionedParamType;
  return options.filter((option: AggregateValueProp) => option.isCompatible(agg));
}

export function TopAggregateParamEditor({
  agg,
  aggParam,
  value,
  showValidation,
  setValue,
  setValidity,
  setTouched,
}: TopAggregateParamEditorProps) {
  const isFirstRun = useRef(true);
  const fieldType = agg.params.field && agg.params.field.type;
  const emptyValue = { text: '', value: 'EMPTY_VALUE', disabled: true, hidden: true };
  const filteredOptions = getCompatibleAggs(agg)
    .map(({ text, value: val }) => ({ text, value: val }))
    .sort((a, b) => a.text.toLowerCase().localeCompare(b.text.toLowerCase()));
  const options = [emptyValue, ...filteredOptions];
  const disabled = fieldType && !filteredOptions.length;
  const isValid = disabled || !!value;

  const label = (
    <>
      <FormattedMessage
        id="visDefaultEditor.controls.aggregateWithLabel"
        defaultMessage="Aggregate with"
      />{' '}
      <EuiIconTip
        position="right"
        type="questionInCircle"
        content={i18n.translate('visDefaultEditor.controls.aggregateWithTooltip', {
          defaultMessage:
            'Choose a strategy for combining multiple hits or a multi-valued field into a single metric.',
        })}
      />
    </>
  );

  useEffect(() => {
    setValidity(isValid);
  }, [isValid, setValidity]);

  useEffect(() => {
    if (isFirstRun.current) {
      isFirstRun.current = false;
      return;
    }

    if (value) {
      if (aggParam.options.find((opt) => opt.value === value.value)) {
        return;
      }

      setValue();
    }

    if (filteredOptions.length === 1) {
      setValue(aggParam.options.find((opt) => opt.value === filteredOptions[0].value));
    }
  }, [aggParam.options, fieldType, filteredOptions, setValue, value]);

  const handleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    if (event.target.value === emptyValue.value) {
      setValue();
    } else {
      setValue(aggParam.options.find((opt) => opt.value === event.target.value));
    }
  };

  return (
    <EuiFormRow
      label={label}
      fullWidth={true}
      isInvalid={showValidation ? !isValid : false}
      display="rowCompressed"
    >
      <EuiSelect
        options={options}
        value={value ? value.value : emptyValue.value}
        onChange={handleChange}
        fullWidth={true}
        compressed
        isInvalid={showValidation ? !isValid : false}
        disabled={disabled}
        onBlur={setTouched}
        data-test-subj="visDefaultEditorAggregateWith"
      />
    </EuiFormRow>
  );
}
