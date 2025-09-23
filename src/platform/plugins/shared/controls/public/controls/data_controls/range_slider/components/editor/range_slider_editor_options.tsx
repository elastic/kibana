/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiFormRow, EuiFieldNumber } from '@elastic/eui';
import React, { useState } from 'react';
import type { RangeSliderControlState } from '@kbn/controls-schemas';
import { RangeSliderStrings } from '../../range_slider_strings';
import type { CustomOptionsComponentProps } from '../../../types';
import { CustomOptionsAdditionalSettings } from '../../../components';

export const RangeSliderEditorOptions = ({
  initialState,
  updateState,
  setControlEditorValid,
}: CustomOptionsComponentProps<RangeSliderControlState>) => {
  const [step, setStep] = useState(initialState.step ?? 1);

  return (
    <>
      <EuiFormRow fullWidth label={RangeSliderStrings.editor.getStepTitle()}>
        <EuiFieldNumber
          compressed
          value={step}
          onChange={(event) => {
            const newStep = event.target.valueAsNumber;
            setStep(newStep);
            updateState({ step: newStep });
            setControlEditorValid(newStep > 0);
          }}
          min={0}
          isInvalid={step === undefined || step <= 0}
          data-test-subj="rangeSliderControl__stepAdditionalSetting"
        />
      </EuiFormRow>
      <CustomOptionsAdditionalSettings initialState={initialState} updateState={updateState} />
    </>
  );
};
