/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiForm, EuiFormRow, EuiSuperSelect, EuiSuperSelectOption } from '@elastic/eui';
import React, { useEffect, useState } from 'react';
import useMount from 'react-use/lib/useMount';
import { GetControlEditorProps } from '../../types';
import {
  OptionsListEmbeddableInput,
  OptionsListFieldFetcher,
  OptionsListIndexPatternFetcher,
} from './options_list_embeddable';
import { OptionsListStrings } from './options_list_strings';

interface OptionsListEditorProps {
  onChange: GetControlEditorProps<OptionsListEmbeddableInput>['onChange'];
  fetchIndexPatterns: OptionsListIndexPatternFetcher;
  fetchFields: OptionsListFieldFetcher;
  initialSelectedField?: string;
  initialSelectedIndexPattern?: string;
}

interface OptionsListEditorState {
  availableIndexPatterns: Array<EuiSuperSelectOption<string>>;
  indexPattern?: string;
  availableFields: Array<EuiSuperSelectOption<string>>;
  field?: string;
}

export const OptionsListEditor = ({
  onChange,
  fetchIndexPatterns,
  fetchFields,
  initialSelectedField,
  initialSelectedIndexPattern,
}: OptionsListEditorProps) => {
  const [state, setState] = useState<OptionsListEditorState>({
    indexPattern: initialSelectedIndexPattern,
    field: initialSelectedField,
    availableIndexPatterns: [],
    availableFields: [],
  });

  const applySelection = ({ field, indexPattern }: { field?: string; indexPattern?: string }) => {
    const newState = { ...(field ? { field } : {}), ...(indexPattern ? { indexPattern } : {}) };
    /**
     * apply state and run onChange concurrently. State is copied here rather than by subscribing to embeddable
     * input so that the same editor component can cover the 'create' use case.
     */

    setState((currentState) => {
      return { ...currentState, ...newState };
    });
    onChange(newState);
  };

  useMount(() => {
    (async () => {
      const indexPatterns = (await fetchIndexPatterns()).map((indexPattern) => ({
        value: indexPattern,
        inputDisplay: indexPattern,
      }));
      setState((currentState) => ({ ...currentState, availableIndexPatterns: indexPatterns }));
    })();
  });

  useEffect(() => {
    (async () => {
      let availableFields: Array<EuiSuperSelectOption<string>> = [];
      if (state.indexPattern) {
        availableFields = (await fetchFields(state.indexPattern)).map((field) => ({
          value: field,
          inputDisplay: field,
        }));
      }
      setState((currentState) => ({ ...currentState, availableFields }));
    })();
  }, [state.indexPattern, fetchFields]);

  return (
    <EuiForm>
      <EuiFormRow label={OptionsListStrings.editor.getIndexPatternTitle()}>
        <EuiSuperSelect
          options={state.availableIndexPatterns}
          onChange={(indexPattern) => applySelection({ indexPattern })}
          valueOfSelected={state.indexPattern}
        />
      </EuiFormRow>
      <EuiFormRow label={OptionsListStrings.editor.getFieldTitle()}>
        <EuiSuperSelect
          options={state.availableFields}
          onChange={(field) => applySelection({ field })}
          valueOfSelected={state.field}
        />
      </EuiFormRow>
    </EuiForm>
  );
};
