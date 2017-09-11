import _ from 'lodash';
import PropTypes from 'prop-types';
import React, { Component } from 'react';
import { ControlEditor } from './control_editor';
import { RangeControlEditor } from './range_control_editor';
import { ListControlEditor } from './list_control_editor';
import { KuiButton, KuiButtonIcon } from 'ui_framework/components';
import { addControl, getTitle, moveControl, newControl, removeControl, setControl } from '../../editor_utils';

export class ControlsTab extends Component {
  constructor(props) {
    super(props);

    this.state = {
      type: 'list'
    };

    this.getIndexPatterns = this.getIndexPatterns.bind(this);
    this.getIndexPattern = this.getIndexPattern.bind(this);
    this.handleAddControl = this.handleAddControl.bind(this);
  }

  async getIndexPatterns(search) {
    const resp = await this.props.scope.vis.API.savedObjectsClient.find({
      type: 'index-pattern',
      fields: ['title'],
      search: `${search}*`,
      search_fields: ['title'],
      perPage: 100
    });
    return resp.savedObjects;
  }

  async getIndexPattern(indexPatternId) {
    return await this.props.scope.vis.API.indexPatterns.get(indexPatternId);
  }

  setVisParam(paramName, paramValue) {
    const params = _.cloneDeep(this.props.scope.vis.params);
    params[paramName] = paramValue;
    this.props.stageEditorParams(params);
  }

  handleLabelChange(controlIndex, evt) {
    const updatedControl = this.props.scope.vis.params.controls[controlIndex];
    updatedControl.label = evt.target.value;
    this.setVisParam('controls', setControl(this.props.scope.vis.params.controls, controlIndex, updatedControl));
  }

  handleIndexPatternChange(controlIndex, evt) {
    const updatedControl = this.props.scope.vis.params.controls[controlIndex];
    updatedControl.indexPattern = evt.value;
    updatedControl.fieldName = '';
    this.setVisParam('controls', setControl(this.props.scope.vis.params.controls, controlIndex, updatedControl));
  }

  handleFieldNameChange(controlIndex, evt) {
    const updatedControl = this.props.scope.vis.params.controls[controlIndex];
    updatedControl.fieldName = evt.value;
    this.setVisParam('controls', setControl(this.props.scope.vis.params.controls, controlIndex, updatedControl));
  }

  handleCheckboxOptionChange(controlIndex, optionName, evt) {
    const updatedControl = this.props.scope.vis.params.controls[controlIndex];
    updatedControl.options[optionName] = evt.target.checked;
    this.setVisParam('controls', setControl(this.props.scope.vis.params.controls, controlIndex, updatedControl));
  }

  handleNumberOptionChange(controlIndex, optionName, evt) {
    const updatedControl = this.props.scope.vis.params.controls[controlIndex];
    updatedControl.options[optionName] = parseFloat(evt.target.value);
    this.setVisParam('controls', setControl(this.props.scope.vis.params.controls, controlIndex, updatedControl));
  }

  handleRemoveControl(controlIndex) {
    this.setVisParam('controls', removeControl(this.props.scope.vis.params.controls, controlIndex));
  }

  moveControl(controlIndex, direction) {
    this.setVisParam('controls', moveControl(this.props.scope.vis.params.controls, controlIndex, direction));
  }

  handleAddControl() {
    this.setVisParam('controls', addControl(this.props.scope.vis.params.controls, newControl(this.state.type)));
  }

  renderControls() {
    return this.props.scope.vis.params.controls.map((controlParams, controlIndex) => {
      let controlEditor = null;
      switch (controlParams.type) {
        case 'list':
          controlEditor = (
            <ListControlEditor
              controlIndex={controlIndex}
              controlParams={controlParams}
              handleIndexPatternChange={this.handleIndexPatternChange.bind(this, controlIndex)}
              handleFieldNameChange={this.handleFieldNameChange.bind(this, controlIndex)}
              getIndexPatterns={this.getIndexPatterns}
              getIndexPattern={this.getIndexPattern}
              handleMultiselectChange={this.handleCheckboxOptionChange.bind(this, controlIndex, 'multiselect')}
              handleSizeChange={this.handleNumberOptionChange.bind(this, controlIndex, 'size')}
            />
          );
          break;
        case 'range':
          controlEditor = (
            <RangeControlEditor
              controlIndex={controlIndex}
              controlParams={controlParams}
              handleIndexPatternChange={this.handleIndexPatternChange.bind(this, controlIndex)}
              handleFieldNameChange={this.handleFieldNameChange.bind(this, controlIndex)}
              getIndexPatterns={this.getIndexPatterns}
              getIndexPattern={this.getIndexPattern}
              handleDecimalPlacesChange={this.handleNumberOptionChange.bind(this, controlIndex, 'decimalPlaces')}
              handleStepChange={this.handleNumberOptionChange.bind(this, controlIndex, 'step')}
            />
          );
          break;
        default:
          throw new Error(`Unhandled control editor type ${controlParams.type}`);
      }
      return (
        <ControlEditor
          key={controlParams.id}
          controlIndex={controlIndex}
          controlLabel={controlParams.label}
          controlTitle={getTitle(controlParams, controlIndex)}
          controlParams={controlParams}
          handleLabelChange={this.handleLabelChange.bind(this, controlIndex)}
          moveUpControl={this.moveControl.bind(this, controlIndex, -1)}
          moveDownControl={this.moveControl.bind(this, controlIndex, 1)}
          handleRemoveControl={this.handleRemoveControl.bind(this, controlIndex)}
        >
          {controlEditor}
        </ControlEditor>
      );
    });
  }

  render() {
    return (
      <div>

        {this.renderControls()}

        <div className="kuiSideBarFormRow">
          <div className="kuiSideBarFormRow__control kuiFieldGroupSection--wide">
            <select
              aria-label="Select control type"
              className="kuiSelect"
              value={this.state.type}
              onChange={evt => this.setState({ type: evt.target.value })}
            >
              <option value="range">Range slider</option>
              <option value="list">Options list</option>
            </select>
          </div>
          <KuiButton
            buttonType="primary"
            type="button"
            icon={<KuiButtonIcon type="create" />}
            onClick={this.handleAddControl}
            data-test-subj="inputControlEditorAddBtn"
          >
            Add
          </KuiButton>
        </div>
      </div>
    );
  }
}

ControlsTab.propTypes = {
  scope: PropTypes.object.isRequired,
  stageEditorParams: PropTypes.func.isRequired
};
