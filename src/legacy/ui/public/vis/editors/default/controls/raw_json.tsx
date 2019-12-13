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

import React, { useEffect } from 'react';

import { EuiFormRow, EuiIconTip, EuiTextArea } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { isValidJson } from '../../../../agg_types/utils';
import { AggParamEditorProps } from '..';

function RawJsonParamEditor({
  agg,
  showValidation,
  value = '',
  setValidity,
  setValue,
  setTouched,
}: AggParamEditorProps<string>) {
  const label = (
    <>
      <FormattedMessage id="data.search.aggs.jsonInputLabel" defaultMessage="JSON input" />{' '}
      <EuiIconTip
        position="right"
        content={i18n.translate('data.search.aggs.jsonInputTooltip', {
          defaultMessage:
            "Any JSON formatted properties you add here will be merged with the elasticsearch aggregation definition for this section. For example 'shard_size' on a terms aggregation.",
        })}
        type="questionInCircle"
      />
    </>
  );
  const isValid = isValidJson(value);

  const onChange = (ev: React.ChangeEvent<HTMLTextAreaElement>) => {
    const textValue = ev.target.value;
    setValue(textValue);
    setValidity(isValidJson(textValue));
  };

  useEffect(() => {
    setValidity(isValid);
  }, [isValid]);

  return (
    <EuiFormRow
      label={label}
      isInvalid={showValidation ? !isValid : false}
      fullWidth={true}
      compressed
    >
      <EuiTextArea
        id={`visEditorRawJson${agg.id}`}
        isInvalid={showValidation ? !isValid : false}
        value={value}
        onChange={onChange}
        rows={2}
        fullWidth={true}
        onBlur={setTouched}
        compressed
      />
    </EuiFormRow>
  );
}

export { RawJsonParamEditor };
