/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React, { useState, useCallback } from 'react';
import { EuiFormRow } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { NumberList } from './components/number_list';
import { AggParamEditorProps } from '../agg_param_props';

function PercentilesEditor({
  agg,
  showValidation,
  value = [],
  setTouched,
  setValidity,
  setValue,
}: AggParamEditorProps<Array<number | undefined>>) {
  const label = i18n.translate('visDefaultEditor.controls.percentiles.percentsLabel', {
    defaultMessage: 'Percents',
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
      id={`visEditorPercentileLabel${agg.id}`}
      isInvalid={showValidation ? !isValid : false}
      display="rowCompressed"
    >
      <NumberList
        labelledbyId={`visEditorPercentileLabel${agg.id}-legend`}
        numberArray={value}
        range="[0,100]"
        disallowDuplicates={true}
        unitName={i18n.translate('visDefaultEditor.controls.percentileRanks.percentUnitNameText', {
          defaultMessage: 'percent',
        })}
        showValidation={showValidation}
        onChange={setValue}
        setTouched={setTouched}
        setValidity={setModelValidity}
      />
    </EuiFormRow>
  );
}

export { PercentilesEditor };
