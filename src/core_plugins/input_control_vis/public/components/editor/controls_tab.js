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

import './controls_tab.less';
import _ from 'lodash';
import PropTypes from 'prop-types';
import React, { Component } from 'react';
import { ControlEditor } from './control_editor';
import { addControl, moveControl, newControl, removeControl, setControl } from '../../editor_utils';
import { getLineageMap, getParentCandidates } from '../../lineage';

import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiPanel,
  EuiSelect,
} from '@elastic/eui';

export class ControlsTab extends Component {

  state = {
    type: 'list'
  }

  getIndexPatterns = async (search) => {
    const resp = await this.props.scope.vis.API.savedObjectsClient.find({
      type: 'index-pattern',
      fields: ['title'],
      search: `${search}*`,
      search_fields: ['title'],
      perPage: 100
    });
    return resp.savedObjects;
  }

  getIndexPattern = async (indexPatternId) => {
    return await this.props.scope.vis.API.indexPatterns.get(indexPatternId);
  }

  setVisParam(paramName, paramValue) {
    const params = _.cloneDeep(this.props.scope.vis.params);
    params[paramName] = paramValue;
    this.props.stageEditorParams(params);
  }

  handleLabelChange = (controlIndex, evt) => {
    const updatedControl = this.props.scope.vis.params.controls[controlIndex];
    updatedControl.label = evt.target.value;
    this.setVisParam('controls', setControl(this.props.scope.vis.params.controls, controlIndex, updatedControl));
  }

  handleIndexPatternChange = (controlIndex, indexPatternId) => {
    const updatedControl = this.props.scope.vis.params.controls[controlIndex];
    updatedControl.indexPattern = indexPatternId;
    updatedControl.fieldName = '';
    this.setVisParam('controls', setControl(this.props.scope.vis.params.controls, controlIndex, updatedControl));
  }

  handleFieldNameChange = (controlIndex, fieldName) => {
    const updatedControl = this.props.scope.vis.params.controls[controlIndex];
    updatedControl.fieldName = fieldName;
    this.setVisParam('controls', setControl(this.props.scope.vis.params.controls, controlIndex, updatedControl));
  }

  handleCheckboxOptionChange = (controlIndex, optionName, evt) => {
    const updatedControl = this.props.scope.vis.params.controls[controlIndex];
    updatedControl.options[optionName] = evt.target.checked;
    this.setVisParam('controls', setControl(this.props.scope.vis.params.controls, controlIndex, updatedControl));
  }

  handleNumberOptionChange = (controlIndex, optionName, evt) => {
    const updatedControl = this.props.scope.vis.params.controls[controlIndex];
    updatedControl.options[optionName] = parseFloat(evt.target.value);
    this.setVisParam('controls', setControl(this.props.scope.vis.params.controls, controlIndex, updatedControl));
  }

  handleRemoveControl = (controlIndex) => {
    this.setVisParam('controls', removeControl(this.props.scope.vis.params.controls, controlIndex));
  }

  moveControl = (controlIndex, direction) => {
    this.setVisParam('controls', moveControl(this.props.scope.vis.params.controls, controlIndex, direction));
  }

  handleAddControl = () => {
    this.setVisParam('controls', addControl(this.props.scope.vis.params.controls, newControl(this.state.type)));
  }

  handleParentChange = (controlIndex, evt) => {
    const updatedControl = this.props.scope.vis.params.controls[controlIndex];
    updatedControl.parent = evt.target.value;
    this.setVisParam('controls', setControl(this.props.scope.vis.params.controls, controlIndex, updatedControl));
  }

  renderControls() {
    const lineageMap = getLineageMap(this.props.scope.vis.params.controls);
    return this.props.scope.vis.params.controls.map((controlParams, controlIndex) => {
      const parentCandidates = getParentCandidates(
        this.props.scope.vis.params.controls,
        controlParams.id,
        lineageMap);
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
          getIndexPatterns={this.getIndexPatterns}
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
    return (
      <div>

        {this.renderControls()}

        <EuiPanel grow={false}>
          <EuiFlexGroup>
            <EuiFlexItem>
              <EuiFormRow
                id="selectControlType"
              >
                <EuiSelect
                  options={[
                    { value: 'range', text: 'Range slider' },
                    { value: 'list', text: 'Options list' },
                  ]}
                  value={this.state.type}
                  onChange={evt => this.setState({ type: evt.target.value })}
                  aria-label="Select control type"
                />
              </EuiFormRow>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiFormRow
                id="addControl"
              >
                <EuiButton
                  fill
                  onClick={this.handleAddControl}
                  iconType="plusInCircle"
                  data-test-subj="inputControlEditorAddBtn"
                  aria-label="Add control"
                >
                  Add
                </EuiButton>
              </EuiFormRow>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPanel>

      </div>
    );
  }
}

ControlsTab.propTypes = {
  scope: PropTypes.object.isRequired,
  stageEditorParams: PropTypes.func.isRequired
};
