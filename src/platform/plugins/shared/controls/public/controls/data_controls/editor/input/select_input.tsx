/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiFormRow, EuiButtonGroup, EuiSpacer, EuiSelectOption } from '@elastic/eui';
import React, { useCallback, useMemo, useState } from 'react';
import { appendStatsByToQuery } from '@kbn/esql-utils';
import { AggregateQuery } from '@kbn/es-query';
import useEffectOnce from 'react-use/lib/useEffectOnce';
import { v4 } from 'uuid';
import {
  DEFAULT_CONTROL_INPUT,
  ControlOutputOption,
  ControlInputOption,
  DefaultDataControlState,
  ControlGroupEditorConfig,
  ESQL_COMPATIBLE_CONTROL_TYPES,
} from '../../../../../common';
import { ListOptionsInput } from '../../../../common/list_options_input/list_options_input';
import { DataControlEditorStrings } from '../../data_control_constants';
import { DataViewAndFieldPicker, useDataViewAndFieldContext } from '../data_view_and_field_picker';
import {
  CONTROL_INPUT_OPTIONS,
  getESQLVariableInvalidRegex,
  EditorComponentStatus,
} from '../editor_constants';
import { ESQLLangEditor } from '../esql_lang_editor';
import { InputValuesPreview } from './input_values_preview';
import { getESQLSingleColumnValues } from '../../common/get_esql_single_column_values';

const fieldToESQLVariable = (fieldName: string) =>
  `?${fieldName.replace(/\./g, '_').replace(getESQLVariableInvalidRegex(), '')}`;

interface SelectInputProps<State> {
  inputMode: ControlInputOption;
  editorState: Partial<State>;
  selectedControlType: string | undefined;
  editorConfig?: ControlGroupEditorConfig;
  setEditorState: (s: Partial<State>) => void;
  setSelectedControlType: (type: string | undefined) => void;
  setDefaultPanelTitle: (title: string) => void;
  setControlOptionsValid: (valid: boolean) => void;
  setESQLQueryValidation: (status: EditorComponentStatus) => void;
  isEdit: boolean;
}

export const SelectInput = <State extends DefaultDataControlState = DefaultDataControlState>({
  inputMode,
  editorConfig,
  editorState,
  selectedControlType,
  setEditorState,
  setSelectedControlType,
  setDefaultPanelTitle,
  setControlOptionsValid,
  setESQLQueryValidation,
  isEdit,
}: SelectInputProps<State>) => {
  const [previewOptions, setPreviewOptions] = useState<string[]>([]);
  const [previewColumns, setPreviewColumns] = useState<string[]>([]);
  const [previewError, setPreviewError] = useState<Error | undefined>();
  const [isPreviewQueryRunning, setIsPreviewQueryRunning] = useState<boolean>(
    isEdit && inputMode === ControlInputOption.ESQL
  );

  const isESQLVariableEmpty = useMemo(
    () => !editorState.esqlVariableString || editorState.esqlVariableString === '?',
    [editorState.esqlVariableString]
  );

  const { fieldRegistry } = useDataViewAndFieldContext();

  // List input needs to track list options with unique IDs for rendering and ordering correctly; track them in a UI
  // state separately from the editorState to prevent the list input from rerendering and losing focus as the user types
  const [staticOptions, setStaticOptions] = useState<EuiSelectOption[]>(
    inputMode !== ControlInputOption.STATIC || !editorState.staticValues
      ? []
      : editorState.staticValues.map((value) => ({ value: v4(), text: value }))
  );
  const onStaticOptionsChange = useCallback(
    (nextOptions: EuiSelectOption[]) => {
      setStaticOptions(nextOptions);
      setEditorState({
        ...editorState,
        staticValues: nextOptions.map(({ text }) => text),
      });
    },
    [editorState, setEditorState]
  );

  const submitESQLQuery = useCallback(
    async (query: string) => {
      setIsPreviewQueryRunning(true);
      const result = await getESQLSingleColumnValues({ query });
      setIsPreviewQueryRunning(false);
      const isSuccess = getESQLSingleColumnValues.isSuccess(result);
      const isMultiColumnError = getESQLSingleColumnValues.isMultiColumnError(result);

      if (!isSuccess && !isMultiColumnError) {
        setPreviewError(result.error);
        setESQLQueryValidation(EditorComponentStatus.ERROR);
        return;
      } else {
        setPreviewError(undefined);
      }

      if (isSuccess) {
        setPreviewOptions(result.values);
        setPreviewColumns([]);
        setESQLQueryValidation(EditorComponentStatus.COMPLETE);

        // Make sure the next editor state matches the submitted query. Calling submitESQLQuery from outside the
        // Run Query button can throw this out of sync
        const nextEditorState = { ...editorState, esqlQuery: query };
        if (!editorState.esqlVariableString) {
          nextEditorState.esqlVariableString = fieldToESQLVariable(result.column);
        }
        if (fieldRegistry) {
          if (Object.hasOwn(fieldRegistry, result.column)) {
            nextEditorState.fieldName = result.column;
          } else if (!result.column.endsWith('.keyword')) {
            const columnWithKeyword = `${result.column}.keyword`;
            if (Object.hasOwn(fieldRegistry, columnWithKeyword))
              nextEditorState.fieldName = columnWithKeyword;
          }
        }
        setEditorState(nextEditorState);

        if (!selectedControlType) {
          setSelectedControlType(ESQL_COMPATIBLE_CONTROL_TYPES[0]);
        }
      } else {
        setPreviewOptions([]);
        setPreviewColumns(result.columns);
        setESQLQueryValidation(EditorComponentStatus.ERROR);
      }
    },
    [
      setESQLQueryValidation,
      editorState,
      setEditorState,
      selectedControlType,
      fieldRegistry,
      setSelectedControlType,
    ]
  );
  // For edit mode, initialize the values preview
  useEffectOnce(() => {
    if (isEdit && editorState.esqlQuery) submitESQLQuery(editorState.esqlQuery);
  });

  const onClickPreviewESQLQuery = useCallback(
    () => submitESQLQuery(editorState.esqlQuery ?? ''),
    [submitESQLQuery, editorState]
  );

  const onESQLQueryChange = useCallback(
    (q: AggregateQuery) => {
      setEditorState({ ...editorState, esqlQuery: q.esql });
      setPreviewError(undefined);
      setPreviewOptions([]);
      setPreviewColumns([]);
      setESQLQueryValidation(EditorComponentStatus.INCOMPLETE);
    },
    [editorState, setEditorState, setESQLQueryValidation]
  );

  const appendColumnToESQLQuery = useCallback(
    (column: string) => {
      const updatedQuery = appendStatsByToQuery(editorState.esqlQuery ?? '', column);
      setEditorState({ ...editorState, esqlQuery: updatedQuery });
      submitESQLQuery(updatedQuery);
    },
    [editorState, setEditorState, submitESQLQuery]
  );

  return (
    <>
      <EuiFormRow data-test-subj="control-editor-input-select">
        <EuiButtonGroup
          isFullWidth
          options={CONTROL_INPUT_OPTIONS}
          idSelected={editorState.input ?? DEFAULT_CONTROL_INPUT}
          onChange={(input) => {
            setEditorState({ ...editorState, input });
          }}
          legend="Select control input"
        />
      </EuiFormRow>
      {inputMode === ControlInputOption.DSL && (
        <DataViewAndFieldPicker
          editorConfig={editorConfig}
          dataViewId={editorState.dataViewId}
          fieldName={editorState.fieldName}
          onChangeDataViewId={(newDataViewId) => {
            setEditorState({ ...editorState, dataViewId: newDataViewId });
            setSelectedControlType(undefined);
          }}
          onSelectField={(field) => {
            const newFieldName = field.name;
            const prevFieldName = editorState.fieldName;
            if (
              // If the user is not in ES|QL output mode
              editorState.output !== ControlOutputOption.ESQL ||
              // Or, if the user the user is in ES|QL output mode, but has not changed the variable name
              isESQLVariableEmpty ||
              editorState.esqlVariableString === fieldToESQLVariable(prevFieldName ?? '')
            ) {
              /**
               * create a default ES|QL variable name from the selected field before setting the field name;
               * we still want to do this even if the user is not in ES|QL output mode, to prepare the variable
               * name in case they switch
               */
              const esqlVariableString = fieldToESQLVariable(newFieldName);
              setEditorState({ ...editorState, fieldName: newFieldName, esqlVariableString });
              setDefaultPanelTitle(esqlVariableString);
            } else {
              /**
               * if the variable name doesn't need changing, just set the field name
               */
              setEditorState({ ...editorState, fieldName: newFieldName });
            }
            /**
             * make sure that the new field is compatible with the selected control type and, if it's not,
             * reset the selected control type to the **first** compatible control type
             */
            const newCompatibleControlTypes =
              fieldRegistry?.[newFieldName]?.compatibleControlTypes ?? [];
            if (!selectedControlType || !newCompatibleControlTypes.includes(selectedControlType!)) {
              setSelectedControlType(newCompatibleControlTypes[0]);
            }

            /**
             * set the control title (i.e. the one set by the user) + default title (i.e. the field display name)
             */
            const newDefaultTitle = field.displayName ?? newFieldName;
            setDefaultPanelTitle(newDefaultTitle);

            setControlOptionsValid(true); // reset options state
          }}
        />
      )}
      {inputMode === ControlInputOption.ESQL && (
        <>
          <ESQLLangEditor
            formLabel={DataControlEditorStrings.manageControl.dataSource.getEsqlQueryTitle()}
            query={{ esql: editorState.esqlQuery ?? '' }}
            editorIsInline
            errors={previewError ? [previewError] : []}
            hideTimeFilterInfo={true}
            disableAutoFocus={true}
            hideRunQueryText
            hideRunQueryButton
            onTextLangQueryChange={onESQLQueryChange}
            onTextLangQuerySubmit={async (q) => {
              if (q) {
                await submitESQLQuery(q.esql);
              }
            }}
            isDisabled={false}
            isLoading={false}
            hasOutline
          />
          <EuiSpacer size="s" />
          <InputValuesPreview
            previewOptions={previewOptions}
            previewColumns={previewColumns}
            previewError={previewError}
            updateQuery={appendColumnToESQLQuery}
            runQuery={onClickPreviewESQLQuery}
            runButtonDisabled={!editorState.esqlQuery}
            isQueryRunning={isPreviewQueryRunning}
          />
        </>
      )}
      {inputMode === ControlInputOption.STATIC && (
        <ListOptionsInput
          label={DataControlEditorStrings.manageControl.dataSource.getListOptionsTitle()}
          value={staticOptions}
          onChange={onStaticOptionsChange}
        />
      )}
    </>
  );
};
