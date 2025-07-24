/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  EuiText,
  EuiFormRow,
  EuiFieldText,
  EuiPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPopover,
  EuiButtonEmpty,
} from '@elastic/eui';
import React, { useMemo, useState } from 'react';
import {
  ControlGroupEditorConfig,
  ControlInputOption,
  ControlOutputOption,
  DEFAULT_CONTROL_OUTPUT,
  DefaultDataControlState,
} from '../../../../../common';
import { DataControlEditorStrings } from '../../data_control_constants';
import { DataViewAndFieldPicker } from '../data_view_and_field_picker';
import { DEFAULT_ESQL_VARIABLE_NAME } from '../editor_constants';
import { OutputSelectRadioGroup } from './output_select_radio_group';

interface SelectOutputProps<State> {
  inputMode: ControlInputOption;
  outputMode: ControlOutputOption;
  editorState: Partial<State>;
  editorConfig?: ControlGroupEditorConfig;
  setEditorState: (s: Partial<State>) => void;
  setDefaultPanelTitle: (title: string) => void;
  setHasTouchedOutput: (b: boolean) => void;
  variableStringError: string | null;
  showESQLOnly: boolean;
}

export const SelectOutput = <State extends DefaultDataControlState = DefaultDataControlState>({
  inputMode,
  outputMode,
  editorConfig,
  editorState,
  setEditorState,
  setDefaultPanelTitle,
  setHasTouchedOutput,
  variableStringError,
  showESQLOnly,
}: SelectOutputProps<State>) => {
  const [isFieldOutputPopoverOpen, setIsFieldOutputPopoverOpen] = useState<boolean>(false);
  const isStaticInputMode = useMemo(() => inputMode === ControlInputOption.STATIC, [inputMode]);

  const esqlVariableOutput = (
    <EuiFormRow
      label="Variable name"
      helpText={DataControlEditorStrings.manageControl.esqlOutput.getEsqlVariableHelpText(
        isStaticInputMode
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
          setEditorState({ ...editorState, esqlVariableString });
          setDefaultPanelTitle(esqlVariableString);
        }}
        onBlur={() => {
          if (editorState.esqlVariableString === '?')
            setEditorState({ ...editorState, esqlVariableString: '' });
        }}
      />
    </EuiFormRow>
  );

  const esqlInputToDSLOutput = (
    <EuiPanel hasBorder>
      <EuiFlexGroup
        alignItems="center"
        justifyContent="center"
        direction="column"
        wrap
        gutterSize="s"
      >
        <EuiFlexItem>
          <EuiText textAlign="center" size="s">
            {DataControlEditorStrings.manageControl.fieldOutput.getFieldOutputDescription(
              editorState.fieldName
            )}
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiPopover
            isOpen={isFieldOutputPopoverOpen}
            closePopover={() => setIsFieldOutputPopoverOpen(false)}
            button={
              <EuiButtonEmpty onClick={() => setIsFieldOutputPopoverOpen(true)}>
                {DataControlEditorStrings.manageControl.fieldOutput.getSelectFieldTitle(
                  !!editorState.fieldName
                )}
              </EuiButtonEmpty>
            }
          >
            <DataViewAndFieldPicker
              editorConfig={editorConfig}
              dataViewId={editorState.dataViewId}
              onChangeDataViewId={(newDataViewId) => {
                setEditorState({ ...editorState, dataViewId: newDataViewId });
              }}
              onSelectField={(field) => {
                setEditorState({ ...editorState, fieldName: field.name });
                /**
                 * set the control title (i.e. the one set by the user) + default title (i.e. the field display name)
                 */
                const newDefaultTitle = field.displayName ?? field.name;
                setDefaultPanelTitle(newDefaultTitle);
              }}
              fieldName={editorState.fieldName}
            />
          </EuiPopover>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );

  const staticInputToDSLOutput = (
    <DataViewAndFieldPicker
      editorConfig={editorConfig}
      dataViewId={editorState.dataViewId}
      onChangeDataViewId={(newDataViewId) => {
        setEditorState({ ...editorState, dataViewId: newDataViewId });
      }}
      onSelectField={(field) => {
        setEditorState({ ...editorState, fieldName: field.name });
        /**
         * set the control title (i.e. the one set by the user) + default title (i.e. the field display name)
         */
        const newDefaultTitle = field.displayName ?? field.name;
        setDefaultPanelTitle(newDefaultTitle);
      }}
      fieldName={editorState.fieldName}
    />
  );

  return (
    <>
      {!showESQLOnly && (
        <EuiFormRow data-test-subj="control-editor-output-settings">
          <div>
            <OutputSelectRadioGroup
              idSelected={outputMode ?? DEFAULT_CONTROL_OUTPUT}
              onChangeOutput={(output) => {
                setEditorState({ ...editorState, output });
                setHasTouchedOutput(true);
              }}
              isDSLInputMode={inputMode === ControlInputOption.DSL}
              fieldName={editorState.fieldName}
            />
          </div>
        </EuiFormRow>
      )}
      {outputMode === ControlOutputOption.ESQL
        ? esqlVariableOutput
        : inputMode === ControlInputOption.ESQL
        ? esqlInputToDSLOutput
        : isStaticInputMode
        ? staticInputToDSLOutput
        : null}
    </>
  );
};
