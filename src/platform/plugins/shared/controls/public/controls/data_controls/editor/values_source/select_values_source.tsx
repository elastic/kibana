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
  DEFAULT_CONTROL_VALUES_SOURCE,
  ControlOutputOption,
  ControlValuesSource,
  OPTIONS_LIST_CONTROL,
} from '@kbn/controls-constants';
import { ESQLLangEditor } from '@kbn/esql/public';
import { DefaultDataControlState, ControlGroupEditorConfig } from '../../../../../common';
import { ListOptionsInput } from './list_options_input/list_options_input';
import { DataControlEditorStrings } from '../../data_control_constants';
import { DataViewAndFieldPicker, useDataViewAndFieldContext } from '../data_view_and_field_picker';
import {
  CONTROL_VALUES_SOURCE_OPTIONS,
  getESQLVariableInvalidRegex,
  EditorComponentStatus,
  INITIAL_EMPTY_STATE_ESQL_QUERY,
} from '../editor_constants';
import { ESQLValuesPreview } from './esql_values_preview';
import { getESQLSingleColumnValues } from '../../common/get_esql_single_column_values';

const fieldToESQLVariable = (fieldName: string) =>
  `?${fieldName.replace(/\./g, '_').replace(getESQLVariableInvalidRegex(), '')}`;

interface SelectValuesSourceProps<State> {
  valuesSource: ControlValuesSource;
  editorState: Partial<State>;
  selectedControlType: string | undefined;
  editorConfig?: ControlGroupEditorConfig;
  updateEditorState: (s: any) => void;
  setSelectedControlType: (type: string | undefined) => void;
  setDefaultPanelTitle: (title: string) => void;
  setControlOptionsValid: (valid: boolean) => void;
  setESQLQueryValidation: (status: EditorComponentStatus) => void;
  setHasTouchedValuesSource: (b: boolean) => void;
  isEdit: boolean;
  showESQLOnly: boolean;
}

export const SelectValuesSource = <
  State extends DefaultDataControlState = DefaultDataControlState
>({
  valuesSource,
  editorConfig,
  editorState,
  selectedControlType,
  updateEditorState,
  setSelectedControlType,
  setDefaultPanelTitle,
  setControlOptionsValid,
  setESQLQueryValidation,
  setHasTouchedValuesSource,
  isEdit,
  showESQLOnly,
}: SelectValuesSourceProps<State>) => {
  const [previewOptions, setPreviewOptions] = useState<string[]>([]);
  const [previewColumns, setPreviewColumns] = useState<string[]>([]);
  const [previewError, setPreviewError] = useState<Error | undefined>();
  const [previewMatchingFieldName, setPreviewMatchingFieldName] = useState<string | undefined>(
    undefined
  );
  const [isPreviewQueryRunning, setIsPreviewQueryRunning] = useState<boolean>(
    isEdit && valuesSource === ControlValuesSource.ESQL
  );

  const isESQLVariableEmpty = useMemo(
    () => !editorState.esqlVariableString || editorState.esqlVariableString === '?',
    [editorState.esqlVariableString]
  );

  const isESQLOutputMode = useMemo(
    () => editorState.output === ControlOutputOption.ESQL,
    [editorState.output]
  );

  const previewFieldMismatchWarning = useMemo(
    () =>
      !isESQLOutputMode &&
      !!previewMatchingFieldName &&
      !!editorState.fieldName &&
      previewMatchingFieldName !== editorState.fieldName
        ? {
            esqlField: previewMatchingFieldName!,
            dslField: editorState.fieldName!,
          }
        : undefined,
    [editorState.fieldName, isESQLOutputMode, previewMatchingFieldName]
  );

  const { fieldRegistry } = useDataViewAndFieldContext();

  const onStaticValuesChange = useCallback(
    (staticValues: EuiSelectOption[]) => {
      setHasTouchedValuesSource(true);
      updateEditorState({
        staticValues: staticValues as State['staticValues'],
      });
      if (!selectedControlType && staticValues.some(({ text }) => !!text)) {
        setSelectedControlType(OPTIONS_LIST_CONTROL);
      }
    },
    [setHasTouchedValuesSource, updateEditorState, selectedControlType, setSelectedControlType]
  );

  const updatePreviewOptionsAndColumns = useCallback(
    (nextOptions: string[], nextColumns: string[]) => {
      updateEditorState({
        staticValues: nextOptions.map((text) => ({ text, value: v4() })),
      });
      setPreviewOptions(nextOptions);
      setPreviewColumns(nextColumns);
      setPreviewMatchingFieldName(undefined);
    },
    [updateEditorState]
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
        updatePreviewOptionsAndColumns(result.values, []);
        setESQLQueryValidation(EditorComponentStatus.COMPLETE);

        // Make sure the next editor state matches the submitted query. Calling submitESQLQuery from outside the
        // Run Query button can throw this out of sync
        const nextEditorState: Partial<DefaultDataControlState> = { esqlQuery: query };
        if (!editorState.esqlVariableString) {
          nextEditorState.esqlVariableString = fieldToESQLVariable(result.column);
        }
        updateEditorState(nextEditorState);

        // Try to detect the matching field for the returned column
        if (fieldRegistry) {
          if (Object.hasOwn(fieldRegistry, result.column)) {
            setPreviewMatchingFieldName(result.column);
          } else if (!result.column.endsWith('.keyword')) {
            const columnWithKeyword = `${result.column}.keyword`;
            if (Object.hasOwn(fieldRegistry, columnWithKeyword))
              setPreviewMatchingFieldName(columnWithKeyword);
          }
        }

        if (!selectedControlType) {
          setSelectedControlType(OPTIONS_LIST_CONTROL);
        }
      } else {
        updatePreviewOptionsAndColumns([], result.columns);
        setESQLQueryValidation(EditorComponentStatus.ERROR);
      }
    },
    [
      setESQLQueryValidation,
      updatePreviewOptionsAndColumns,
      editorState,
      fieldRegistry,
      updateEditorState,
      selectedControlType,
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
      setHasTouchedValuesSource(true);
      updateEditorState({ ...editorState, esqlQuery: q.esql });
      setPreviewError(undefined);
      updatePreviewOptionsAndColumns([], []);
      setESQLQueryValidation(EditorComponentStatus.INCOMPLETE);
    },
    [
      setHasTouchedValuesSource,
      updateEditorState,
      editorState,
      updatePreviewOptionsAndColumns,
      setESQLQueryValidation,
    ]
  );

  const appendColumnToESQLQuery = useCallback(
    (column: string) => {
      const updatedQuery = appendStatsByToQuery(editorState.esqlQuery ?? '', column);
      updateEditorState({ ...editorState, esqlQuery: updatedQuery });
      submitESQLQuery(updatedQuery);
    },
    [editorState, updateEditorState, submitESQLQuery]
  );

  const lockToStatic = useMemo(
    () =>
      editorState.esqlVariableString?.startsWith('??') &&
      editorState.valuesSource === ControlValuesSource.STATIC,
    [editorState.esqlVariableString, editorState.valuesSource]
  );
  const inputOptions = useMemo(
    () =>
      (showESQLOnly
        ? CONTROL_VALUES_SOURCE_OPTIONS.filter(({ id }) => id !== ControlValuesSource.DSL)
        : CONTROL_VALUES_SOURCE_OPTIONS
      ).map(({ id, ...rest }) => {
        if (!lockToStatic || id === ControlValuesSource.STATIC) {
          return { id, ...rest };
        }
        return {
          id,
          ...rest,
          toolTipContent: DataControlEditorStrings.manageControl.esqlOutput.getInvalidPrefixError(),
        };
      }),
    [showESQLOnly, lockToStatic]
  );

  return (
    <>
      <EuiFormRow
        data-test-subj="control-editor-input-select"
        label={DataControlEditorStrings.manageControl.getConfigureInputTitle()}
      >
        <EuiButtonGroup
          isFullWidth
          options={inputOptions}
          idSelected={editorState.valuesSource ?? DEFAULT_CONTROL_VALUES_SOURCE}
          onChange={(source) => {
            updateEditorState({ valuesSource: source as ControlValuesSource });
            setHasTouchedValuesSource(true);
          }}
          legend="Select control input"
          isDisabled={lockToStatic}
        />
      </EuiFormRow>
      {valuesSource === ControlValuesSource.DSL && isESQLOutputMode && (
        <DataViewAndFieldPicker
          editorConfig={editorConfig}
          dataViewId={editorState.dataViewId}
          fieldName={editorState.fieldName}
          onChangeDataViewId={(newDataViewId) => {
            updateEditorState({ ...editorState, dataViewId: newDataViewId });
            setSelectedControlType(undefined);
            setHasTouchedValuesSource(true);
          }}
          onSelectField={(field) => {
            setHasTouchedValuesSource(true);
            const newFieldName = field.name;
            const prevFieldName = editorState.fieldName;
            if (
              // If the user is in ES|QL output mode
              editorState.output === ControlOutputOption.ESQL ||
              // Or if they are not in ES|QL ouput mode and have not set the variable name
              isESQLVariableEmpty ||
              editorState.esqlVariableString === fieldToESQLVariable(prevFieldName ?? '')
            ) {
              /**
               * create a default ES|QL variable name from the selected field before setting the field name;
               * we still want to do this even if the user is not in ES|QL output mode, to prepare the variable
               * name in case they switch
               */
              const esqlVariableString = fieldToESQLVariable(newFieldName);
              updateEditorState({ ...editorState, fieldName: newFieldName, esqlVariableString });
              setDefaultPanelTitle(esqlVariableString);
            } else {
              /**
               * if the variable name doesn't need changing, just set the field name
               */
              updateEditorState({ ...editorState, fieldName: newFieldName });
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
      {valuesSource === ControlValuesSource.ESQL && (
        <>
          <ESQLLangEditor
            formLabel={DataControlEditorStrings.manageControl.dataSource.getEsqlQueryTitle()}
            query={{ esql: editorState.esqlQuery ?? INITIAL_EMPTY_STATE_ESQL_QUERY }}
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
            expandToFitQueryOnMount
          />
          <EuiSpacer size="s" />
          <ESQLValuesPreview
            previewOptions={previewOptions}
            previewColumns={previewColumns}
            previewError={previewError}
            updateQuery={appendColumnToESQLQuery}
            runQuery={onClickPreviewESQLQuery}
            runButtonDisabled={!editorState.esqlQuery}
            isQueryRunning={isPreviewQueryRunning}
            previewFieldMismatchWarning={previewFieldMismatchWarning}
          />
        </>
      )}
      {valuesSource === ControlValuesSource.STATIC && (
        <ListOptionsInput
          label={DataControlEditorStrings.manageControl.dataSource.getListOptionsTitle()}
          value={editorState.staticValues ?? []}
          onChange={onStaticValuesChange}
          maxOptions={1000}
          suggestions={previewOptions}
        />
      )}
    </>
  );
};
