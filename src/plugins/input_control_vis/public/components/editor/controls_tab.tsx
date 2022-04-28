/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { PureComponent } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';

import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiPanel,
  EuiSelect,
} from '@elastic/eui';

import { VisEditorOptionsProps } from '@kbn/visualizations-plugin/public';
import { DataView } from '@kbn/data-views-plugin/public';
import { ControlEditor } from './control_editor';
import {
  addControl,
  moveControl,
  newControl,
  removeControl,
  setControl,
  ControlParams,
  CONTROL_TYPES,
  ControlParamsOptions,
} from '../../editor_utils';
import { getLineageMap, getParentCandidates } from '../../lineage';
import { InputControlVisDependencies } from '../../plugin';
import { InputControlVisParams } from '../../types';

interface ControlsTabUiState {
  type: CONTROL_TYPES;
}

export type ControlsTabProps = VisEditorOptionsProps<InputControlVisParams> & {
  deps: InputControlVisDependencies;
};

class ControlsTab extends PureComponent<ControlsTabProps, ControlsTabUiState> {
  state = {
    type: CONTROL_TYPES.LIST,
  };

  getIndexPattern = async (indexPatternId: string): Promise<DataView> => {
    const [, startDeps] = await this.props.deps.core.getStartServices();
    return await startDeps.data.indexPatterns.get(indexPatternId);
  };

  onChange = (value: ControlParams[]) => this.props.setValue('controls', value);

  handleLabelChange = (controlIndex: number, label: string) => {
    const updatedControl = {
      ...this.props.stateParams.controls[controlIndex],
      label,
    };
    this.onChange(setControl(this.props.stateParams.controls, controlIndex, updatedControl));
  };

  handleIndexPatternChange = (controlIndex: number, indexPattern: string) => {
    const updatedControl = {
      ...this.props.stateParams.controls[controlIndex],
      indexPattern,
      fieldName: '',
    };
    this.onChange(setControl(this.props.stateParams.controls, controlIndex, updatedControl));
  };

  handleFieldNameChange = (controlIndex: number, fieldName: string) => {
    const updatedControl = {
      ...this.props.stateParams.controls[controlIndex],
      fieldName,
    };
    this.onChange(setControl(this.props.stateParams.controls, controlIndex, updatedControl));
  };

  handleOptionsChange = <T extends keyof ControlParamsOptions>(
    controlIndex: number,
    optionName: T,
    value: ControlParamsOptions[T]
  ) => {
    const control = this.props.stateParams.controls[controlIndex];
    const updatedControl = {
      ...control,
      options: {
        ...control.options,
        [optionName]: value,
      },
    };
    this.onChange(setControl(this.props.stateParams.controls, controlIndex, updatedControl));
  };

  handleRemoveControl = (controlIndex: number) => {
    this.onChange(removeControl(this.props.stateParams.controls, controlIndex));
  };

  moveControl = (controlIndex: number, direction: number) => {
    this.onChange(moveControl(this.props.stateParams.controls, controlIndex, direction));
  };

  handleAddControl = () => {
    this.onChange(addControl(this.props.stateParams.controls, newControl(this.state.type)));
  };

  handleParentChange = (controlIndex: number, parent: string) => {
    const updatedControl = {
      ...this.props.stateParams.controls[controlIndex],
      parent,
    };
    this.onChange(setControl(this.props.stateParams.controls, controlIndex, updatedControl));
  };

  renderControls() {
    const lineageMap = getLineageMap(this.props.stateParams.controls);
    return this.props.stateParams.controls.map((controlParams, controlIndex) => {
      const parentCandidates = getParentCandidates(
        this.props.stateParams.controls,
        controlParams.id,
        lineageMap
      );
      return (
        <ControlEditor
          key={controlParams.id}
          controlIndex={controlIndex}
          controlParams={controlParams}
          handleLabelChange={this.handleLabelChange}
          moveControl={this.moveControl}
          handleRemoveControl={this.handleRemoveControl}
          handleIndexPatternChange={this.handleIndexPatternChange}
          handleFieldNameChange={this.handleFieldNameChange}
          getIndexPattern={this.getIndexPattern}
          handleOptionsChange={this.handleOptionsChange}
          parentCandidates={parentCandidates}
          handleParentChange={this.handleParentChange}
          deps={this.props.deps}
        />
      );
    });
  }

  render() {
    return (
      <div>
        {this.renderControls()}

        <EuiPanel grow={false}>
          <EuiFlexGroup>
            <EuiFlexItem>
              <EuiFormRow id="selectControlType">
                <EuiSelect
                  data-test-subj="selectControlType"
                  options={[
                    {
                      value: CONTROL_TYPES.RANGE,
                      text: i18n.translate(
                        'inputControl.editor.controlsTab.select.rangeDropDownOptionLabel',
                        {
                          defaultMessage: 'Range slider',
                        }
                      ),
                    },
                    {
                      value: CONTROL_TYPES.LIST,
                      text: i18n.translate(
                        'inputControl.editor.controlsTab.select.listDropDownOptionLabel',
                        {
                          defaultMessage: 'Options list',
                        }
                      ),
                    },
                  ]}
                  value={this.state.type}
                  onChange={(event) => this.setState({ type: event.target.value as CONTROL_TYPES })}
                  aria-label={i18n.translate(
                    'inputControl.editor.controlsTab.select.controlTypeAriaLabel',
                    {
                      defaultMessage: 'Select control type',
                    }
                  )}
                />
              </EuiFormRow>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiFormRow id="addControl">
                <EuiButton
                  fill
                  onClick={this.handleAddControl}
                  iconType="plusInCircle"
                  data-test-subj="inputControlEditorAddBtn"
                  aria-label={i18n.translate(
                    'inputControl.editor.controlsTab.select.addControlAriaLabel',
                    {
                      defaultMessage: 'Add control',
                    }
                  )}
                >
                  <FormattedMessage
                    id="inputControl.editor.controlsTab.addButtonLabel"
                    defaultMessage="Add"
                  />
                </EuiButton>
              </EuiFormRow>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPanel>
      </div>
    );
  }
}

// default export required for React.Lazy
// eslint-disable-next-line import/no-default-export
export { ControlsTab as default };
