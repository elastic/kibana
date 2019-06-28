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

import React, { useEffect, useRef } from 'react';
import { EuiFormRow, EuiIconTip, EuiSelect } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { AggParamEditorProps } from 'ui/vis/editors/default';
import { AggConfig } from 'ui/vis';
import { AggParam } from '../agg_param';
import { SelectValueProp, SelectParamEditorProps } from '../param_types/select';

interface AggregateValueProp extends SelectValueProp {
  isCompatibleType(filedType: string): boolean;
  isCompatibleVis(visName: string): boolean;
}

function getCompatibleAggs(agg: AggConfig, visName: string): AggregateValueProp[] {
  const fieldType = agg.params.field && agg.params.field.type;
  const { options = [] } = agg.getAggParams().find(({ name }: AggParam) => name === 'aggregate');
  return options.filter(
    (option: AggregateValueProp) =>
      fieldType && option.isCompatibleType(fieldType) && option.isCompatibleVis(visName)
  );
}

function TopAggregateParamEditor({
  agg,
  aggParam,
  value,
  visName,
  showValidation,
  setValue,
  setValidity,
  setTouched,
  wrappedWithInlineComp,
}: AggParamEditorProps<AggregateValueProp> & SelectParamEditorProps<AggregateValueProp>) {
  const isFirstRun = useRef(true);
  const fieldType = agg.params.field && agg.params.field.type;
  const emptyValue = { text: '', value: 'EMPTY_VALUE', disabled: true, hidden: true };
  const filteredOptions = getCompatibleAggs(agg, visName)
    .map(({ text, value: val }) => ({ text, value: val }))
    .sort((a, b) => a.text.toLowerCase().localeCompare(b.text.toLowerCase()));
  const options = [emptyValue, ...filteredOptions];
  const disabled = fieldType && !filteredOptions.length;
  const isValid = disabled || !!value;

  const label = (
    <>
      <FormattedMessage
        id="common.ui.aggTypes.aggregateWithLabel"
        defaultMessage="Aggregate with"
      />{' '}
      <EuiIconTip
        position="right"
        type="questionInCircle"
        content={i18n.translate('common.ui.aggTypes.aggregateWithTooltip', {
          defaultMessage:
            'Choose a strategy for combining multiple hits or a multi-valued field into a single metric.',
        })}
      />
    </>
  );

  useEffect(
    () => {
      setValidity(isValid);
    },
    [isValid]
  );

  useEffect(
    () => {
      if (isFirstRun.current) {
        isFirstRun.current = false;
        return;
      }

      if (value) {
        if (aggParam.options.byValue[value.value]) {
          return;
        }

        setValue();
      }

      if (filteredOptions.length === 1) {
        setValue(aggParam.options.byValue[filteredOptions[0].value]);
      }
    },
    [fieldType, visName]
  );

  const handleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    if (event.target.value === emptyValue.value) {
      setValue();
    } else {
      setValue(aggParam.options.byValue[event.target.value]);
    }
  };

  return (
    <EuiFormRow
      label={label}
      fullWidth={true}
      isInvalid={showValidation ? !isValid : false}
      className={wrappedWithInlineComp ? undefined : 'visEditorSidebar__aggParamFormRow'}
    >
      <EuiSelect
        options={options}
        value={value ? value.value : emptyValue.value}
        onChange={handleChange}
        fullWidth={true}
        isInvalid={showValidation ? !isValid : false}
        disabled={disabled}
        onBlur={setTouched}
      />
    </EuiFormRow>
  );
}

export { TopAggregateParamEditor, getCompatibleAggs };
