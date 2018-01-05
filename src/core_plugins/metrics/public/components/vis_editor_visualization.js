import PropTypes from 'prop-types';
import React, { Component } from 'react';
import { keyCodes } from '@elastic/eui';
import Visualization from './visualization';
import Toggle from 'react-toggle';
import 'react-toggle/style.css';

const MIN_CHART_HEIGHT = 250;

class VisEditorVisualization extends Component {
  constructor(props) {
    super(props);
    this.state = {
      height: MIN_CHART_HEIGHT,
      dragging: false
    };

    this.handleMouseUp = this.handleMouseUp.bind(this);
    this.handleMouseDown = this.handleMouseDown.bind(this);
    this.onSizeHandleKeyDown = this.onSizeHandleKeyDown.bind(this);
  }

  handleMouseDown() {
    this.setState({ dragging: true });
  }

  handleMouseUp() {
    this.setState({ dragging: false });
  }

  componentWillMount() {
    this.handleMouseMove = (event) => {
      if (this.state.dragging) {
        this.setState((prevState) => ({
          height: Math.max(MIN_CHART_HEIGHT, prevState.height + event.movementY)
        }));
      }
    };
    window.addEventListener('mousemove', this.handleMouseMove);
    window.addEventListener('mouseup', this.handleMouseUp);
  }

  componentWillUnmount() {
    window.removeEventListener('mousemove', this.handleMouseMove);
    window.removeEventListener('mouseup', this.handleMouseUp);
  }

  /**
   * Resize the chart height when pressing up/down while the drag handle
   * for resizing has the focus.
   * We use 15px steps to do the scaling and make sure the chart has at least its
   * defined minimum width (MIN_CHART_HEIGHT).
   */
  onSizeHandleKeyDown(ev) {
    const { keyCode } = ev;
    if (keyCode === keyCodes.UP || keyCode === keyCodes.DOWN) {
      ev.preventDefault();
      this.setState((prevState) => {
        const newHeight = prevState.height + (keyCode === keyCodes.UP ? -15 : 15);
        return {
          height: Math.max(MIN_CHART_HEIGHT, newHeight)
        };
      });
    }
  }

  render() {
    const { dirty, autoApply } = this.props;
    const style = { height: this.state.height };
    if (this.state.dragging) {
      style.userSelect = 'none';
    }

    const applyButtonClassName = dirty ? 'thor__button-solid-default' : 'thor__button-outlined-grayLight';
    let applyMessage = 'The latest changes have been applied.';
    if (dirty) applyMessage = 'The changes to this visualization have not been applied.';
    if (autoApply) applyMessage = 'The changes will be automatically applied.';
    const applyButton = (
      <div className="vis_editor__dirty_controls">
        <label
          className="vis_editor__dirty_controls-toggle-label"
          id="tsvbAutoApply"
          htmlFor="tsvbAutoApplyInput"
        >
          Auto Apply
        </label>
        <div className="vis_editor__dirty_controls-toggle">
          <Toggle
            id="tsvbAutoApplyInput"
            defaultChecked={autoApply}
            icons={false}
            onChange={this.props.onToggleAutoApply}
          />
        </div>
        <div className="vis_editor__dirty_controls-button">
          <button
            disabled={!dirty}
            onClick={this.props.onCommit}
            className={`${applyButtonClassName} md`}
          >
            <i className="fa fa-play" /> Apply Changes
          </button>
        </div>
        <div className={`vis_editor__dirty_controls-message${dirty ? '-dirty' : ''}`}>
          {applyMessage}
        </div>
      </div>
    );

    const visBackgroundColor = '#FFF';
    return (
      <div>
        <div
          style={style}
          className="vis_editor__visualization"
          data-shared-items-container
          data-shared-item
          data-title={this.props.title}
          data-description={this.props.description}
          data-render-complete="disabled"
        >
          <Visualization
            backgroundColor={visBackgroundColor}
            className="dashboard__visualization"
            dateFormat={this.props.dateFormat}
            model={this.props.model}
            onBrush={this.props.onBrush}
            onChange={this.handleChange}
            onUiState={this.props.onUiState}
            uiState={this.props.uiState}
            visData={this.props.visData}
          />
        </div>
        <div className="vis-editor-hide-for-reporting">
          {applyButton}
          <button
            className="vis_editor__visualization-draghandle"
            onMouseDown={this.handleMouseDown}
            onMouseUp={this.handleMouseUp}
            onKeyDown={this.onSizeHandleKeyDown}
            aria-label="Press up/down to adjust the chart size"
          >
            <i className="fa fa-ellipsis-h" />
          </button>
        </div>
      </div>
    );
  }
}

VisEditorVisualization.propTypes = {
  model: PropTypes.object,
  onBrush: PropTypes.func,
  onChange: PropTypes.func,
  onCommit: PropTypes.func,
  onUiState: PropTypes.func,
  uiState: PropTypes.object,
  onToggleAutoApply: PropTypes.func,
  visData: PropTypes.object,
  dirty: PropTypes.bool,
  autoApply: PropTypes.bool,
  dateFormat: PropTypes.string
};

export default VisEditorVisualization;
