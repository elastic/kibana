/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useState } from 'react';

import { EuiFormRow, EuiSwitch } from '@elastic/eui';

import { OptionsListStrings } from './options_list_strings';
import { OptionsListEmbeddableInput } from '../types';
import { ControlEditorProps } from '../..';

interface OptionsListEditorState {
  singleSelect?: boolean;
  runPastTimeout?: boolean;
}

export const OptionsListEditorOptions = ({
  initialInput,
  onChange,
}: ControlEditorProps<OptionsListEmbeddableInput>) => {
  const [state, setState] = useState<OptionsListEditorState>({
    singleSelect: initialInput?.singleSelect,
    runPastTimeout: initialInput?.runPastTimeout,
  });

  return (
    <>
      <EuiFormRow>
        <EuiSwitch
          label={OptionsListStrings.editor.getAllowMultiselectTitle()}
          checked={!state.singleSelect}
          onChange={() => {
            onChange({ singleSelect: !state.singleSelect });
            setState((s) => ({ ...s, singleSelect: !s.singleSelect }));
          }}
        />
      </EuiFormRow>
      <EuiFormRow>
        <EuiSwitch
          label={OptionsListStrings.editor.getRunPastTimeoutTitle()}
          checked={Boolean(state.runPastTimeout)}
          onChange={() => {
            onChange({ runPastTimeout: !state.runPastTimeout });
            setState((s) => ({ ...s, runPastTimeout: !s.runPastTimeout }));
          }}
        />
      </EuiFormRow>
    </>
  );
};
