import _ from 'lodash';
import PropTypes from 'prop-types';
import React, { Component } from 'react';
import { ControlEditor } from './control_editor';
import { RangeControlEditor } from './range_control_editor';
import { TermsControlEditor } from './terms_control_editor';
import { KuiFieldGroup, KuiFieldGroupSection, KuiButton, KuiButtonIcon } from 'ui_framework/components';
import { addControl, moveControl, newControl, removeControl, setControl } from '../lib/editor_utils';

export class InputControlVisEditor extends Component {
  constructor(props) {
    super(props);

    this.state = {
      type: 'terms'
    };

    this.getIndexPatterns = async () => {
      const resp = await props.scope.vis.API.savedObjectsClient.find({
        type: 'index-pattern',
        fields: ['title'],
        perPage: 10000
      });
      return resp.savedObjects;
    };
    this.getIndexPattern = async (indexPatternId) => {
      return await props.scope.vis.API.indexPatterns.get(indexPatternId);
    };
    this.handleAddControl = this.handleAddControl.bind(this);
    this.handleUpdateFiltersChange = this.handleUpdateFiltersChange.bind(this);
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

  handleUpdateFiltersChange(evt) {
    this.setVisParam('updateFiltersOnChange', evt.target.checked);
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
      }
      return (
        <ControlEditor
          key={controlParams.id}
          controlIndex={controlIndex}
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

        <div className="sidebar-item">
          <div className="vis-editor-agg-header">
            <KuiFieldGroup>
              <KuiFieldGroupSection>
                <label>
                  <input
                    className="kuiCheckBox"
                    type="checkbox"
                    checked={this.props.scope.vis.params.updateFiltersOnChange}
                    onChange={this.handleUpdateFiltersChange}
                  />
                  Update kibana filters on each change
                </label>
              </KuiFieldGroupSection>
            </KuiFieldGroup>
          </div>
        </div>

        {this.renderControls()}

        <div className="kuiSideBarFormRow">
          <KuiButton
            buttonType="primary"
            type="button"
            icon={<KuiButtonIcon type="create" />}
            onClick={this.handleAddControl}
          >
            Add
          </KuiButton>
          <div className="kuiSideBarFormRow__control kuiFieldGroupSection--wide">
            <select
              className="kuiSelect"
              value={this.state.type}
              onChange={evt => this.setState({ type: evt.target.value })}
            >
              <option value="range">Range Slider</option>
              <option value="terms">Terms Dropdown</option>
            </select>
          </div>
        </div>
      </div>
    );
  }
}

InputControlVisEditor.propTypes = {
  scope: PropTypes.object.isRequired,
  stageEditorParams: PropTypes.func.isRequired
};
