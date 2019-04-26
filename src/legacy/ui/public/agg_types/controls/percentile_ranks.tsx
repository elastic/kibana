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

import { EuiFormRow } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { AggParamEditorProps } from '../../vis/editors/default';
import { NumberList } from '../number_list/new_number_list';

function PercentileRanksEditor({
  agg,
  isInvalid,
  value,
  setTouched,
  setValidity,
  setValue,
}: AggParamEditorProps<Array<number | undefined>>) {
  const label = i18n.translate('common.ui.aggTypes.valuesLabel', { defaultMessage: 'Values' });

  // useEffect(
  //   () => {
  //     if (value.length === 0) {
  //       setValidity(false);
  //     }
  //   },
  //   [value]
  // );

  return (
    <EuiFormRow
      isInvalid={isInvalid}
      label={label}
      fullWidth={true}
      id={`visEditorPercentileRanksLabel${agg.id}`}
      className="visEditorSidebar__aggParamFormRow"
    >
      <NumberList
        labelledbyId={`visEditorPercentileRanksLabel${agg.id}`}
        numberArray={value}
        range="[-Infinity,Infinity]"
        unitName="value"
        showValidation={isInvalid}
        onChange={setValue}
        setTouched={setTouched}
        setValidity={setValidity}
      />
    </EuiFormRow>
  );
}

export { PercentileRanksEditor };
