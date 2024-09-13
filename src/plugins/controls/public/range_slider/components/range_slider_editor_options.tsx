/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState } from 'react';
import { EuiFormRow, EuiFieldNumber } from '@elastic/eui';

import type { RangeSliderEmbeddableInput } from '../../../common/range_slider/types';
import { ControlEditorProps } from '../../types';

import { RangeSliderStrings } from './range_slider_strings';

export const RangeSliderEditorOptions = ({
  initialInput,
  onChange,
  setControlEditorValid,
}: ControlEditorProps<RangeSliderEmbeddableInput>) => {
  const [step, setStep] = useState<number>(initialInput?.step || 1);

  return (
    <>
      <EuiFormRow fullWidth label={RangeSliderStrings.editor.getStepTitle()}>
        <EuiFieldNumber
          value={step}
          onChange={(event) => {
            const newStep = event.target.valueAsNumber;
            onChange({ step: newStep });
            setStep(newStep);
            setControlEditorValid(newStep > 0);
          }}
          min={0}
          isInvalid={step <= 0}
          data-test-subj="rangeSliderControl__stepAdditionalSetting"
        />
      </EuiFormRow>
    </>
  );
};
