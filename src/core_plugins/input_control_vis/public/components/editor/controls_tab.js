import './controls_tab.less';
import _ from 'lodash';
import PropTypes from 'prop-types';
import React, { Component } from 'react';
import { ControlEditor } from './control_editor';
import { addControl, moveControl, newControl, removeControl, setControl, getTitle } from '../../editor_utils';

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

  handleIndexPatternChange = (controlIndex, evt) => {
    const updatedControl = this.props.scope.vis.params.controls[controlIndex];
    updatedControl.indexPattern = evt.value;
    updatedControl.fieldName = '';
    this.setVisParam('controls', setControl(this.props.scope.vis.params.controls, controlIndex, updatedControl));
  }

  handleFieldNameChange = (controlIndex, evt) => {
    const updatedControl = this.props.scope.vis.params.controls[controlIndex];
    updatedControl.fieldName = evt.value;
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

  getControlParams = (controlId) => {
    this.props.scope.vis.params.controls.find((controlParams) => {
      return controlParams.id === controlId;
    });
  }

  getLineageMap = () => {
    const lineageMap = new Map();
    this.props.scope.vis.params.controls.forEach((controlParams) => {
      const lineage = [];
      const getLineage = (controlParams) => {
        if (_.has(controlParams, 'parent') && !lineage.includes(controlParams.parent)) {
          lineage.push(controlParams.parent);
          const parent = this.getControlParams(controlParams.parent);
          getLineage(parent);
        }
      };

      getLineage(controlParams);
      lineageMap.set(controlParams.id, lineage);
    });
    return lineageMap;
  }

  getParentCandidates = (controlId, lineageMap) => {
    return this.props.scope.vis.params.controls.filter((controlParams) => {
      // not itself
      if (controlParams.id === controlId) {
        return false;
      }

      // has index pattern and field
      if (!controlParams.indexPattern || !controlParams.fieldName) {
        return false;
      }

      // does not create a circlar dependency
      const lineage = lineageMap.get(controlParams.id);
      if (lineage.includes(controlId)) {
        return false;
      }

      return true;
    }).map((controlParams, controlIndex) => {
      return {
        value: controlParams.id,
        text: getTitle(controlParams, controlIndex)
      };
    });
  }

  handleParentChange = (controlIndex, evt) => {
    const updatedControl = this.props.scope.vis.params.controls[controlIndex];
    updatedControl.parent = evt.target.value;
    this.setVisParam('controls', setControl(this.props.scope.vis.params.controls, controlIndex, updatedControl));
  }

  renderControls() {
    const lineageMap = this.getLineageMap();
    return this.props.scope.vis.params.controls.map((controlParams, controlIndex) => {
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
          parentCandidates={this.getParentCandidates(controlParams.id, lineageMap)}
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
