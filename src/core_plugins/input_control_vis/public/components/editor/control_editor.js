import classNames from 'classnames';
import PropTypes from 'prop-types';
import React, { Component } from 'react';
import { RangeControlEditor } from './range_control_editor';
import { ListControlEditor } from './list_control_editor';
import { getTitle } from '../../editor_utils';

export class ControlEditor extends Component {

  state = {
    isEditorCollapsed: true
  }

  handleToggleControlVisibility = () => {
    this.setState(prevState => (
      {  isEditorCollapsed: !prevState.isEditorCollapsed }
    ));
  }

  changeLabel = (evt) => {
    this.props.handleLabelChange(this.props.controlIndex, evt);
  }

  removeControl = () => {
    this.props.handleRemoveControl(this.props.controlIndex);
  }

  moveUpControl = () => {
    this.props.moveControl(this.props.controlIndex, -1);
  }

  moveDownControl = () => {
    this.props.moveControl(this.props.controlIndex, 1);
  }

  changeIndexPattern = (evt) => {
    this.props.handleIndexPatternChange(this.props.controlIndex, evt);
  }

  changeFieldName = (evt) => {
    this.props.handleFieldNameChange(this.props.controlIndex, evt);
  }

  renderEditor() {
    let controlEditor = null;
    switch (this.props.controlParams.type) {
      case 'list':
        controlEditor = (
          <ListControlEditor
            controlIndex={this.props.controlIndex}
            controlParams={this.props.controlParams}
            handleIndexPatternChange={this.changeIndexPattern}
            handleFieldNameChange={this.changeFieldName}
            getIndexPatterns={this.props.getIndexPatterns}
            getIndexPattern={this.props.getIndexPattern}
            handleNumberOptionChange={this.props.handleNumberOptionChange}
            handleCheckboxOptionChange={this.props.handleCheckboxOptionChange}
          />
        );
        break;
      case 'range':
        controlEditor = (
          <RangeControlEditor
            controlIndex={this.props.controlIndex}
            controlParams={this.props.controlParams}
            handleIndexPatternChange={this.changeIndexPattern}
            handleFieldNameChange={this.changeFieldName}
            getIndexPatterns={this.props.getIndexPatterns}
            getIndexPattern={this.props.getIndexPattern}
            handleNumberOptionChange={this.props.handleNumberOptionChange}
          />
        );
        break;
      default:
        throw new Error(`Unhandled control editor type ${this.props.controlParams.type}`);
    }

    const labelId = `controlLabel${this.props.controlIndex}`;
    return (
      <div>
        <div className="kuiSideBarFormRow">
          <label className="kuiSideBarFormRow__label" htmlFor={labelId}>
            Label
          </label>
          <div className="kuiSideBarFormRow__control kuiFieldGroupSection--wide">
            <input
              className="kuiTextInput"
              id={labelId}
              type="text"
              value={this.props.controlParams.label}
              onChange={this.changeLabel}
            />
          </div>
        </div>

        {controlEditor}
      </div>
    );
  }

  render() {
    const visibilityToggleClasses = classNames('fa', {
      'fa-caret-right': !this.state.isEditorCollapsed,
      'fa-caret-down': this.state.isEditorCollapsed
    });

    return (
      <div className="sidebar-item">
        <div className="vis-editor-agg-header">
          <button
            aria-label={this.state.isEditorCollapsed ? 'Close Editor' : 'Open Editor'}
            onClick={this.handleToggleControlVisibility}
            type="button"
            className="kuiButton kuiButton--primary kuiButton--small vis-editor-agg-header-toggle"
          >
            <i aria-hidden="true" className={visibilityToggleClasses} />
          </button>
          <span className="vis-editor-agg-header-title ng-binding">
            {getTitle(this.props.controlParams, this.props.controlIndex)}
          </span>
          <div className="vis-editor-agg-header-controls kuiButtonGroup kuiButtonGroup--united">
            <button
              aria-label="Move control down"
              type="button"
              className="kuiButton kuiButton--small"
              onClick={this.moveDownControl}
              data-test-subj={`inputControlEditorMoveDownControl${this.props.controlIndex}`}
            >
              <i aria-hidden="true" className="fa fa-chevron-down" />
            </button>
            <button
              aria-label="Move control up"
              type="button"
              className="kuiButton kuiButton--small"
              onClick={this.moveUpControl}
              data-test-subj={`inputControlEditorMoveUpControl${this.props.controlIndex}`}
            >
              <i aria-hidden="true" className="fa fa-chevron-up" />
            </button>
            <button
              aria-label="Remove control"
              className="kuiButton kuiButton--danger kuiButton--small"
              type="button"
              onClick={this.removeControl}
              data-test-subj={`inputControlEditorRemoveControl${this.props.controlIndex}`}
            >
              <i aria-hidden="true" className="fa fa-times" />
            </button>
          </div>
        </div>

        {this.state.isEditorCollapsed && this.renderEditor()}
      </div>
    );
  }
}

ControlEditor.propTypes = {
  controlIndex: PropTypes.number.isRequired,
  controlParams: PropTypes.object.isRequired,
  handleLabelChange: PropTypes.func.isRequired,
  moveControl: PropTypes.func.isRequired,
  handleRemoveControl: PropTypes.func.isRequired,
  handleIndexPatternChange: PropTypes.func.isRequired,
  handleFieldNameChange: PropTypes.func.isRequired,
  getIndexPatterns: PropTypes.func.isRequired,
  getIndexPattern: PropTypes.func.isRequired,
  handleCheckboxOptionChange: PropTypes.func.isRequired,
  handleNumberOptionChange: PropTypes.func.isRequired
};
