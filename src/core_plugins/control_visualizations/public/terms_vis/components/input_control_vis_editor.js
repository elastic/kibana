import _ from 'lodash';
import React, { Component } from 'react';
import { ControlEditor } from './control_editor';
import { RangeControlEditor } from './range_control_editor';
import { TermsControlEditor } from './terms_control_editor';
import { TextControlEditor } from './text_control_editor';
import {
  KuiButton,
  KuiButtonIcon,
} from 'ui_framework/components';
import { addControl, getDefaultOptions, moveControl, newControl, removeControl, setControl } from '../lib/editor_utils';

export class InputControlVisEditor extends Component {
  constructor(props) {
    super(props);

    this.props.scope.vis.params = props.scope.vis.params;
    this.getIndexPatterns = async () => {
      return await props.scope.vis.API.indexPatterns.getIndexPatterns();
    };
    this.getIndexPattern = (indexPatternId) => {
      return props.scope.vis.API.indexPatterns.get(indexPatternId);
    };
    this.handleAddControl = this.handleAddControl.bind(this);
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

  handleTypeChange(controlIndex, evt) {
    const updatedControl = this.props.scope.vis.params.controls[controlIndex];
    updatedControl.type = evt.target.value;
    updatedControl.options = getDefaultOptions(updatedControl.type);
    updatedControl.fieldName = '';
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
    this.setVisParam('controls', addControl(this.props.scope.vis.params.controls, newControl('terms')));
  }

  renderControls() {
    return this.props.scope.vis.params.controls.map((controlParams, controlIndex) => {
      let controlEditor = null;
      switch (controlParams.type) {
        case 'terms':
          controlEditor = (
            <TermsControlEditor
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
              controlParams={controlParams}
              handleIndexPatternChange={this.handleIndexPatternChange.bind(this, controlIndex)}
              handleFieldNameChange={this.handleFieldNameChange.bind(this, controlIndex)}
              getIndexPatterns={this.getIndexPatterns}
              getIndexPattern={this.getIndexPattern}
              handleStepChange={this.handleNumberOptionChange.bind(this, controlIndex, 'step')}
            />
          );
          break;
        case 'text':
          controlEditor = (
            <TextControlEditor
              controlParams={controlParams}
              handleIndexPatternChange={this.handleIndexPatternChange.bind(this, controlIndex)}
              handleFieldNameChange={this.handleFieldNameChange.bind(this, controlIndex)}
              getIndexPatterns={this.getIndexPatterns}
              getIndexPattern={this.getIndexPattern}
            />
          );
      }
      return (
        <ControlEditor
          key={controlIndex}
          controlIndex={controlIndex}
          controlParams={controlParams}
          handleLabelChange={this.handleLabelChange.bind(this, controlIndex)}
          moveUpControl={this.moveControl.bind(this, controlIndex, -1)}
          moveDownControl={this.moveControl.bind(this, controlIndex, 1)}
          handleRemoveControl={this.handleRemoveControl.bind(this, controlIndex)}
          handleTypeChange={this.handleTypeChange.bind(this, controlIndex)}
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

        <KuiButton
          buttonType="primary"
          type="button"
          icon={<KuiButtonIcon type="create" />}
          onClick={this.handleAddControl}
        >
          Add
        </KuiButton>
      </div>
    );
  }
}
