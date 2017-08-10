import classNames from 'classnames';
import React, { Component, PropTypes } from 'react';

export class ControlEditor extends Component {

  constructor(props) {
    super(props);

    this.state = {
      isEditorVisible: true
    };
  }

  handleToggleControlVisibility() {
    this.setState({
      isEditorVisible: !this.state.isEditorVisible
    });
  }

  render() {
    let editor;
    if (this.state.isEditorVisible) {
      editor = (
        <div>
          <div className="kuiSideBarFormRow">
            <label className="kuiSideBarFormRow__label">
              Label
            </label>
            <div className="kuiSideBarFormRow__control kuiFieldGroupSection--wide">
              <input
                className="kuiTextInput"
                type="text"
                value={this.props.controlParams.label}
                onChange={this.props.handleLabelChange}
              />
            </div>
          </div>

          {this.props.children}
        </div>
      );
    }

    const visibilityToggleClasses = classNames('fa', {
      'fa-caret-right': !this.state.isEditorVisible,
      'fa-caret-down': this.state.isEditorVisible
    });

    let controlTitle = `${this.props.controlParams.type}: ${this.props.controlIndex}`;
    if (this.props.controlParams.label) {
      controlTitle = `${this.props.controlParams.type}: ${this.props.controlParams.label}`;
    } else if (this.props.controlParams.fieldName) {
      controlTitle = `${this.props.controlParams.type}: ${this.props.controlParams.fieldName}`;
    }

    return (
      <div className="sidebar-item">
        <div className="vis-editor-agg-header">
          <button
            aria-label={this.state.isEditorVisible ? 'Close Editor' : 'Open Editor'}
            onClick={this.handleToggleControlVisibility.bind(this)}
            type="button"
            className="kuiButton kuiButton--primary kuiButton--small vis-editor-agg-header-toggle"
          >
            <i aria-hidden="true" className={visibilityToggleClasses} />
          </button>
          <span className="vis-editor-agg-header-title ng-binding">
            {controlTitle}
          </span>
          <div className="vis-editor-agg-header-controls kuiButtonGroup kuiButtonGroup--united">
            <button
              type="button"
              className="kuiButton kuiButton--small"
              onClick={this.props.moveDownControl}
            >
              <i aria-hidden="true" className="fa fa-chevron-down" />
            </button>
            <button
              type="button"
              className="kuiButton kuiButton--small"
              onClick={this.props.moveUpControl}
            >
              <i aria-hidden="true" className="fa fa-chevron-up" />
            </button>
            <button
              aria-label="Remove Control"
              className="kuiButton kuiButton--danger kuiButton--small"
              type="button"
              onClick={this.props.handleRemoveControl}
            >
              <i aria-hidden="true" className="fa fa-times" />
            </button>
          </div>
        </div>

        {editor}
      </div>
    );
  }
}

ControlEditor.propTypes = {
  controlIndex: PropTypes.number.isRequired,
  controlParams: PropTypes.object.isRequired,
  handleLabelChange: PropTypes.func.isRequired,
  moveUpControl: PropTypes.func.isRequired,
  moveDownControl: PropTypes.func.isRequired,
  handleRemoveControl: PropTypes.func.isRequired,
  children: PropTypes.node.isRequired
};
