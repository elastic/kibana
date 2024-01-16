/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useState } from 'react';
import { EuiFormRow, EuiFieldNumber } from '@elastic/eui';

import type { RangeSliderEmbeddableInput } from '../../../common/range_slider/types';
import { ControlEditorProps } from '../../types';

import { RangeSliderStrings } from './range_slider_strings';

interface RangeSliderEditorState {
  step: number;
}

export const RangeSliderEditorOptions = ({
  initialInput,
  onChange,
  setControlEditorValid,
}: ControlEditorProps<RangeSliderEmbeddableInput>) => {
  const [state, setState] = useState<RangeSliderEditorState>({
    step: initialInput?.step || 1,
  });

  return (
    <>
      <EuiFormRow fullWidth label={RangeSliderStrings.editor.getStepTitle()}>
        <EuiFieldNumber
          value={state.step}
          onChange={(event) => {
            const step = event.target.valueAsNumber;
            onChange({ step });
            setState((s) => ({ ...s, step }));
            setControlEditorValid(step > 0);
          }}
          min={0}
          isInvalid={state.step <= 0}
        />
      </EuiFormRow>
    </>
  );
};
