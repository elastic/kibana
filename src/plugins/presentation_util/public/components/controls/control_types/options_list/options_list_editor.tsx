/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import useMount from 'react-use/lib/useMount';
import React, { useEffect, useState } from 'react';
import { EuiFormRow, EuiSuperSelect, EuiSuperSelectOption, EuiSwitch } from '@elastic/eui';

import { ControlEditorProps, GetControlEditorComponentProps } from '../../types';
import { OptionsListStrings } from './options_list_strings';
import { pluginServices } from '../../../../services';
import { OptionsListEmbeddableInput } from './types';

interface OptionsListEditorProps extends ControlEditorProps {
  onChange: GetControlEditorComponentProps<OptionsListEmbeddableInput>['onChange'];
  initialInput?: Partial<OptionsListEmbeddableInput>;
}

interface OptionsListEditorState {
  singleSelect?: boolean;

  dataViewIdSelectOptions: Array<EuiSuperSelectOption<string>>;
  dataViewId?: string;

  fieldNameSelectOptions: Array<EuiSuperSelectOption<string>>;
  fieldName?: string;
}

export const OptionsListEditor = ({
  onChange,
  initialInput,
  setValidState,
}: OptionsListEditorProps) => {
  // Presentation Services Context
  const { dataViews } = pluginServices.getHooks();
  const { getIdsWithTitle, get } = dataViews.useService();

  const [state, setState] = useState<OptionsListEditorState>({
    dataViewId: initialInput?.dataViewId,
    fieldName: initialInput?.fieldName,
    singleSelect: initialInput?.singleSelect,
    dataViewIdSelectOptions: [],
    fieldNameSelectOptions: [],
  });

  const applySelection = ({
    fieldName,
    singleSelect,
    dataViewId,
  }: {
    fieldName?: string;
    singleSelect?: boolean;
    dataViewId?: string;
  }) => {
    const newState = {
      ...(fieldName ? { fieldName } : {}),
      ...(dataViewId ? { dataViewId } : {}),
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
      const newDataViews = await getIdsWithTitle();
      const newDataViewSelectOptions = newDataViews.map((dataView) => ({
        value: dataView.id,
        inputDisplay: dataView.title,
      }));

      setState((currentState) => ({
        ...currentState,
        dataViewIdSelectOptions: newDataViewSelectOptions,
      }));
    })();
  });

  useEffect(() => {
    (async () => {
      let newFieldNameSelectOptions: Array<EuiSuperSelectOption<string>> = [];
      if (state.dataViewId) {
        const newFields = (await get(state.dataViewId)).fields;
        newFieldNameSelectOptions = newFields.map((field) => ({
          value: field.name,
          inputDisplay: field.displayName ?? field.name,
        }));
      }
      setState((currentState) => ({
        ...currentState,
        fieldNameSelectOptions: newFieldNameSelectOptions,
      }));
    })();
  }, [get, state.dataViewId]);

  useEffect(
    () => setValidState(Boolean(state.fieldName) && Boolean(state.dataViewId)),
    [state.fieldName, setValidState, state.dataViewId]
  );

  return (
    <>
      <EuiFormRow label={OptionsListStrings.editor.getIndexPatternTitle()}>
        <EuiSuperSelect
          options={state.dataViewIdSelectOptions}
          onChange={(dataViewId) => applySelection({ dataViewId })}
          valueOfSelected={state.dataViewId}
        />
      </EuiFormRow>
      <EuiFormRow label={OptionsListStrings.editor.getFieldTitle()}>
        <EuiSuperSelect
          disabled={!state.dataViewId}
          options={state.fieldNameSelectOptions}
          onChange={(fieldName) => applySelection({ fieldName })}
          valueOfSelected={state.fieldName}
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
