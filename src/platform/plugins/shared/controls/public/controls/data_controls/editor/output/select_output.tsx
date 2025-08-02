/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiFormRow, EuiFieldText, EuiButtonGroup, EuiSpacer } from '@elastic/eui';
import React, { useMemo } from 'react';
import {
  ControlValuesSource,
  ControlOutputOption,
  DEFAULT_CONTROL_OUTPUT,
} from '@kbn/controls-constants';
import { ControlGroupEditorConfig, DefaultDataControlState } from '../../../../../common';
import { DataControlEditorStrings } from '../../data_control_constants';
import { DataViewAndFieldPicker } from '../data_view_and_field_picker';
import { CONTROL_OUTPUT_OPTIONS, DEFAULT_ESQL_VARIABLE_NAME } from '../editor_constants';

interface SelectOutputProps<State> {
  valuesSource: ControlValuesSource;
  outputMode: ControlOutputOption;
  editorState: Partial<State>;
  editorConfig?: ControlGroupEditorConfig;
  updateEditorState: (s: any) => void;
  setDefaultPanelTitle: (title: string) => void;
  setSelectedControlType: (type: string | undefined) => void;
  setControlOptionsValid: (valid: boolean) => void;
  variableStringError: string | null;
  showESQLOnly: boolean;
}

export const SelectOutput = <State extends DefaultDataControlState = DefaultDataControlState>({
  valuesSource,
  outputMode,
  editorConfig,
  editorState,
  updateEditorState,
  setDefaultPanelTitle,
  setControlOptionsValid,
  setSelectedControlType,
  variableStringError,
  showESQLOnly,
}: SelectOutputProps<State>) => {
  const isStaticValuesSource = useMemo(
    () => valuesSource === ControlValuesSource.STATIC,
    [valuesSource]
  );

  const esqlVariableOutput = (
    <EuiFormRow
      label="Variable name"
      helpText={DataControlEditorStrings.manageControl.esqlOutput.getEsqlVariableHelpText(
        isStaticValuesSource
      )}
      isInvalid={!!variableStringError}
      error={variableStringError}
    >
      <EuiFieldText
        placeholder={DEFAULT_ESQL_VARIABLE_NAME}
        value={editorState.esqlVariableString}
        compressed
        isInvalid={!!variableStringError}
        onChange={({ target: { value } }) => {
          const esqlVariableString = value.startsWith('?')
            ? value.startsWith('???')
              ? `??${value.replace(/\?/g, '')}`
              : value
            : `?${value}`;
          updateEditorState({ esqlVariableString });
          setDefaultPanelTitle(esqlVariableString);
        }}
        onBlur={() => {
          if (editorState.esqlVariableString === '?') updateEditorState({ esqlVariableString: '' });
        }}
      />
    </EuiFormRow>
  );

  const dslOutput = (
    <DataViewAndFieldPicker
      editorConfig={editorConfig}
      dataViewId={editorState.dataViewId}
      fieldName={editorState.fieldName}
      onChangeDataViewId={(newDataViewId) => {
        updateEditorState({ dataViewId: newDataViewId });
        setSelectedControlType(undefined);
      }}
      onSelectField={(field) => {
        updateEditorState({ fieldName: field.name });

        /**
         * set the control title (i.e. the one set by the user) + default title (i.e. the field display name)
         */
        const newDefaultTitle = field.displayName ?? field.name;
        setDefaultPanelTitle(newDefaultTitle);

        setControlOptionsValid(true); // reset options state
      }}
    />
  );

  return (
    <>
      {!showESQLOnly && (
        <>
          <EuiFormRow
            data-test-subj="control-editor-output-settings"
            label={DataControlEditorStrings.manageControl.getConfigureOutputTitle()}
          >
            <EuiButtonGroup
              isFullWidth
              options={CONTROL_OUTPUT_OPTIONS}
              idSelected={outputMode ?? DEFAULT_CONTROL_OUTPUT}
              onChange={(output) => updateEditorState({ output })}
              legend="Select control output"
            />
          </EuiFormRow>
          <EuiSpacer size="s" />
        </>
      )}
      {outputMode === ControlOutputOption.ESQL ? esqlVariableOutput : dslOutput}
    </>
  );
};
