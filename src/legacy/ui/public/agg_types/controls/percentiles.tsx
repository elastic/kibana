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

import React, { useState } from 'react';

import { EuiFormRow } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { AggParamEditorProps } from '../../vis/editors/default';
import { NumberList } from '../number_list';

function PercentilesEditor({
  agg,
  showValidation,
  value = [],
  setTouched,
  setValidity,
  setValue,
}: AggParamEditorProps<Array<number | undefined>>) {
  const label = i18n.translate('common.ui.aggTypes.percentiles.percentsLabel', {
    defaultMessage: 'Percents',
  });
  const [isValid, setIsValid] = useState(true);

  const setModelValidy = (isListValid: boolean) => {
    setIsValid(isListValid);
    setValidity(isListValid);
  };

  return (
    <EuiFormRow
      label={label}
      labelType="legend"
      fullWidth={true}
      id={`visEditorPercentileLabel${agg.id}`}
      isInvalid={showValidation ? !isValid : false}
      compressed
    >
      <NumberList
        labelledbyId={`visEditorPercentileLabel${agg.id}-legend`}
        numberArray={value}
        range="[0,100]"
        validateAscendingOrder={false}
        unitName={i18n.translate('common.ui.aggTypes.percentileRanks.percentUnitNameText', {
          defaultMessage: 'percent',
        })}
        showValidation={showValidation}
        onChange={setValue}
        setTouched={setTouched}
        setValidity={setModelValidy}
      />
    </EuiFormRow>
  );
}

export { PercentilesEditor };
