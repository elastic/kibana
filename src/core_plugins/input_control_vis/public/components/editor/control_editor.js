import classNames from 'classnames';
import PropTypes from 'prop-types';
import React, { Component } from 'react';

export class ControlEditor extends Component {

  constructor(props) {
    super(props);

    this.state = {
      isEditorCollapsed: true
    };
  }

  handleToggleControlVisibility() {
    this.setState(prevState => (
      {  isEditorCollapsed: !prevState.isEditorCollapsed }
    ));
  }

  renderEditor() {
    return (
      <div>
        <div className="kuiSideBarFormRow">
          <label className="kuiSideBarFormRow__label">
            Label
          </label>
          <div className="kuiSideBarFormRow__control kuiFieldGroupSection--wide">
            <input
              className="kuiTextInput"
              type="text"
              value={this.props.controlLabel}
              onChange={this.props.handleLabelChange}
            />
          </div>
        </div>

        {this.props.children}
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
            onClick={this.handleToggleControlVisibility.bind(this)}
            type="button"
            className="kuiButton kuiButton--primary kuiButton--small vis-editor-agg-header-toggle"
          >
            <i aria-hidden="true" className={visibilityToggleClasses} />
          </button>
          <span className="vis-editor-agg-header-title ng-binding">
            {this.props.controlTitle}
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

        {this.state.isEditorCollapsed && this.renderEditor()}
      </div>
    );
  }
}

ControlEditor.propTypes = {
  controlIndex: PropTypes.number.isRequired,
  controlLabel: PropTypes.string.isRequired,
  controlTitle: PropTypes.string.isRequired,
  handleLabelChange: PropTypes.func.isRequired,
  moveUpControl: PropTypes.func.isRequired,
  moveDownControl: PropTypes.func.isRequired,
  handleRemoveControl: PropTypes.func.isRequired,
  children: PropTypes.node.isRequired
};
