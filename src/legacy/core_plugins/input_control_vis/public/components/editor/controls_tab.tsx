/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import React, { PureComponent } from 'react';
import { InjectedIntlProps } from 'react-intl';

import { injectI18n, FormattedMessage } from '@kbn/i18n/react';
import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiPanel,
  EuiSelect,
} from '@elastic/eui';

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
import { IIndexPattern } from '../../../../../../plugins/data/public';
import { VisOptionsProps } from '../../legacy_imports';
import { InputControlVisDependencies } from '../../plugin';

interface ControlsTabUiState {
  type: CONTROL_TYPES;
}

interface ControlsTabUiParams {
  controls: ControlParams[];
}
type ControlsTabUiInjectedProps = InjectedIntlProps &
  Pick<VisOptionsProps<ControlsTabUiParams>, 'vis' | 'stateParams' | 'setValue'> & {
    deps: InputControlVisDependencies;
  };

export type ControlsTabUiProps = ControlsTabUiInjectedProps;

class ControlsTabUi extends PureComponent<ControlsTabUiProps, ControlsTabUiState> {
  state = {
    type: CONTROL_TYPES.LIST,
  };

  getIndexPattern = async (indexPatternId: string): Promise<IIndexPattern> => {
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
    const { intl } = this.props;

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
                      text: intl.formatMessage({
                        id: 'inputControl.editor.controlsTab.select.rangeDropDownOptionLabel',
                        defaultMessage: 'Range slider',
                      }),
                    },
                    {
                      value: CONTROL_TYPES.LIST,
                      text: intl.formatMessage({
                        id: 'inputControl.editor.controlsTab.select.listDropDownOptionLabel',
                        defaultMessage: 'Options list',
                      }),
                    },
                  ]}
                  value={this.state.type}
                  onChange={event => this.setState({ type: event.target.value as CONTROL_TYPES })}
                  aria-label={intl.formatMessage({
                    id: 'inputControl.editor.controlsTab.select.controlTypeAriaLabel',
                    defaultMessage: 'Select control type',
                  })}
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
                  aria-label={intl.formatMessage({
                    id: 'inputControl.editor.controlsTab.select.addControlAriaLabel',
                    defaultMessage: 'Add control',
                  })}
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

export const ControlsTab = injectI18n(ControlsTabUi);

export const getControlsTab = (deps: InputControlVisDependencies) => (
  props: Omit<ControlsTabUiProps, 'core'>
) => <ControlsTab {...props} deps={deps} />;
