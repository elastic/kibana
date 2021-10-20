/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiFormRow, EuiSuperSelect, EuiSuperSelectOption, EuiSwitch } from '@elastic/eui';
import React, { useEffect, useState } from 'react';
import useMount from 'react-use/lib/useMount';
import { IFieldType, IIndexPattern } from '../../../../../../data/public';
import { ControlEditorProps, GetControlEditorComponentProps } from '../../types';
import {
  OptionsListEmbeddableInput,
  OptionsListFieldFetcher,
  OptionsListIndexPatternFetcher,
} from './options_list_embeddable';
import { OptionsListStrings } from './options_list_strings';

interface OptionsListEditorProps extends ControlEditorProps {
  onChange: GetControlEditorComponentProps<OptionsListEmbeddableInput>['onChange'];
  fetchIndexPatterns: OptionsListIndexPatternFetcher;
  initialInput?: Partial<OptionsListEmbeddableInput>;
  fetchFields: OptionsListFieldFetcher;
}

interface OptionsListEditorState {
  singleSelect?: boolean;

  indexPatternSelectOptions: Array<EuiSuperSelectOption<string>>;
  availableIndexPatterns?: { [key: string]: IIndexPattern };
  indexPattern?: IIndexPattern;

  fieldSelectOptions: Array<EuiSuperSelectOption<string>>;
  availableFields?: { [key: string]: IFieldType };
  field?: IFieldType;
}

export const OptionsListEditor = ({
  onChange,
  fetchFields,
  initialInput,
  setValidState,
  fetchIndexPatterns,
}: OptionsListEditorProps) => {
  const [state, setState] = useState<OptionsListEditorState>({
    indexPattern: initialInput?.indexPattern,
    field: initialInput?.field,
    singleSelect: initialInput?.singleSelect,
    indexPatternSelectOptions: [],
    fieldSelectOptions: [],
  });

  const applySelection = ({
    field,
    singleSelect,
    indexPattern,
  }: {
    field?: IFieldType;
    singleSelect?: boolean;
    indexPattern?: IIndexPattern;
  }) => {
    const newState = {
      ...(field ? { field } : {}),
      ...(indexPattern ? { indexPattern } : {}),
      ...(singleSelect !== undefined ? { singleSelect } : {}),
    };
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
      const newIndexPatterns = await fetchIndexPatterns();
      const newAvailableIndexPatterns = newIndexPatterns.reduce(
        (acc: { [key: string]: IIndexPattern }, curr) => ((acc[curr.title] = curr), acc),
        {}
      );
      const newIndexPatternSelectOptions = newIndexPatterns.map((indexPattern) => ({
        value: indexPattern.title,
        inputDisplay: indexPattern.title,
      }));
      setState((currentState) => ({
        ...currentState,
        availableIndexPatterns: newAvailableIndexPatterns,
        indexPatternSelectOptions: newIndexPatternSelectOptions,
      }));
    })();
  });

  useEffect(() => {
    (async () => {
      let newFieldSelectOptions: Array<EuiSuperSelectOption<string>> = [];
      let newAvailableFields: { [key: string]: IFieldType } = {};
      if (state.indexPattern) {
        const newFields = await fetchFields(state.indexPattern);
        newAvailableFields = newFields.reduce(
          (acc: { [key: string]: IFieldType }, curr) => ((acc[curr.name] = curr), acc),
          {}
        );
        newFieldSelectOptions = newFields.map((field) => ({
          value: field.name,
          inputDisplay: field.displayName ?? field.name,
        }));
      }
      setState((currentState) => ({
        ...currentState,
        fieldSelectOptions: newFieldSelectOptions,
        availableFields: newAvailableFields,
      }));
    })();
  }, [state.indexPattern, fetchFields]);

  useEffect(
    () => setValidState(Boolean(state.field) && Boolean(state.indexPattern)),
    [state.field, setValidState, state.indexPattern]
  );

  return (
    <>
      <EuiFormRow label={OptionsListStrings.editor.getIndexPatternTitle()}>
        <EuiSuperSelect
          options={state.indexPatternSelectOptions}
          onChange={(patternTitle) =>
            applySelection({ indexPattern: state.availableIndexPatterns?.[patternTitle] })
          }
          valueOfSelected={state.indexPattern?.title}
        />
      </EuiFormRow>
      <EuiFormRow label={OptionsListStrings.editor.getFieldTitle()}>
        <EuiSuperSelect
          disabled={!state.indexPattern}
          options={state.fieldSelectOptions}
          onChange={(fieldName) => applySelection({ field: state.availableFields?.[fieldName] })}
          valueOfSelected={state.field?.name}
        />
      </EuiFormRow>
      <EuiFormRow>
        <EuiSwitch
          label={OptionsListStrings.editor.getAllowMultiselectTitle()}
          checked={!state.singleSelect}
          onChange={(e) => applySelection({ singleSelect: !e.target.checked })}
        />
      </EuiFormRow>
    </>
  );
};
