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

import PropTypes from 'prop-types';
import React, { Component } from 'react';
import { ControlEditor } from './control_editor';
import { addControl, moveControl, newControl, removeControl, setControl } from '../../editor_utils';
import { getLineageMap, getParentCandidates } from '../../lineage';
import { injectI18n, FormattedMessage } from '@kbn/i18n/react';
import { start as data } from '../../../../../core_plugins/data/public/legacy';

import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiPanel,
  EuiSelect,
} from '@elastic/eui';

class ControlsTabUi extends Component {
  state = {
    type: 'list',
  };

  getIndexPattern = async indexPatternId => {
    return await data.indexPatterns.indexPatterns.get(indexPatternId);
  };

  onChange = value => this.props.setValue('controls', value);

  handleLabelChange = (controlIndex, evt) => {
    const updatedControl = this.props.stateParams.controls[controlIndex];
    updatedControl.label = evt.target.value;
    this.onChange(setControl(this.props.stateParams.controls, controlIndex, updatedControl));
  };

  handleIndexPatternChange = (controlIndex, indexPatternId) => {
    const updatedControl = this.props.stateParams.controls[controlIndex];
    updatedControl.indexPattern = indexPatternId;
    updatedControl.fieldName = '';
    this.onChange(setControl(this.props.stateParams.controls, controlIndex, updatedControl));
  };

  handleFieldNameChange = (controlIndex, fieldName) => {
    const updatedControl = this.props.stateParams.controls[controlIndex];
    updatedControl.fieldName = fieldName;
    this.onChange(setControl(this.props.stateParams.controls, controlIndex, updatedControl));
  };

  handleCheckboxOptionChange = (controlIndex, optionName, evt) => {
    const updatedControl = this.props.stateParams.controls[controlIndex];
    updatedControl.options[optionName] = evt.target.checked;
    this.onChange(setControl(this.props.stateParams.controls, controlIndex, updatedControl));
  };

  handleNumberOptionChange = (controlIndex, optionName, evt) => {
    const updatedControl = this.props.stateParams.controls[controlIndex];
    updatedControl.options[optionName] = parseFloat(evt.target.value);
    this.onChange(setControl(this.props.stateParams.controls, controlIndex, updatedControl));
  };

  handleRemoveControl = controlIndex => {
    this.onChange(removeControl(this.props.stateParams.controls, controlIndex));
  };

  moveControl = (controlIndex, direction) => {
    this.onChange(moveControl(this.props.stateParams.controls, controlIndex, direction));
  };

  handleAddControl = () => {
    this.onChange(addControl(this.props.stateParams.controls, newControl(this.state.type)));
  };

  handleParentChange = (controlIndex, evt) => {
    const updatedControl = this.props.stateParams.controls[controlIndex];
    updatedControl.parent = evt.target.value;
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
          handleCheckboxOptionChange={this.handleCheckboxOptionChange}
          handleNumberOptionChange={this.handleNumberOptionChange}
          parentCandidates={parentCandidates}
          handleParentChange={this.handleParentChange}
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
                      value: 'range',
                      text: intl.formatMessage({
                        id: 'inputControl.editor.controlsTab.select.rangeDropDownOptionLabel',
                        defaultMessage: 'Range slider',
                      }),
                    },
                    {
                      value: 'list',
                      text: intl.formatMessage({
                        id: 'inputControl.editor.controlsTab.select.listDropDownOptionLabel',
                        defaultMessage: 'Options list',
                      }),
                    },
                  ]}
                  value={this.state.type}
                  onChange={evt => this.setState({ type: evt.target.value })}
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

ControlsTabUi.propTypes = {
  vis: PropTypes.object.isRequired,
  setValue: PropTypes.func.isRequired,
};

export const ControlsTab = injectI18n(ControlsTabUi);
