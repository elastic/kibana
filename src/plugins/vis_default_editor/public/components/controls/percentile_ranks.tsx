/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState, useCallback } from 'react';
import { EuiFormRow } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { NumberList } from './components/number_list';
import { AggParamEditorProps } from '../agg_param_props';

function PercentileRanksEditor({
  agg,
  showValidation,
  value = [],
  setTouched,
  setValidity,
  setValue,
}: AggParamEditorProps<Array<number | undefined>>) {
  const label = i18n.translate('visDefaultEditor.controls.percentileRanks.valuesLabel', {
    defaultMessage: 'Values',
  });
  const [isValid, setIsValid] = useState(true);

  const setModelValidity = useCallback(
    (isListValid: boolean) => {
      setIsValid(isListValid);
      setValidity(isListValid);
    },
    [setValidity]
  );

  return (
    <EuiFormRow
      label={label}
      labelType="legend"
      fullWidth={true}
      id={`visEditorPercentileRanksLabel${agg.id}`}
      isInvalid={showValidation ? !isValid : false}
      display="rowCompressed"
      data-test-subj="visEditorPercentileRanks"
    >
      <NumberList
        labelledbyId={`visEditorPercentileRanksLabel${agg.id}-legend`}
        numberArray={value}
        range="[-Infinity,Infinity]"
        unitName={i18n.translate('visDefaultEditor.controls.percentileRanks.valueUnitNameText', {
          defaultMessage: 'value',
        })}
        validateAscendingOrder={true}
        showValidation={showValidation}
        onChange={setValue}
        setTouched={setTouched}
        setValidity={setModelValidity}
      />
    </EuiFormRow>
  );
}

export { PercentileRanksEditor };
