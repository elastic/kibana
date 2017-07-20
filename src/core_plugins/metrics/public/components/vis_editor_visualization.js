import React, { Component, PropTypes } from 'react';
import { findDOMNode } from 'react-dom';
import Visualization from './visualization';
import Toggle from 'react-toggle';
import 'react-toggle/style.css';

class VisEditorVisualization extends Component {

  constructor(props) {
    super(props);
    this.state = {
      height: 250,
      dragging: false
    };

    this.handleMouseUp = this.handleMouseUp.bind(this);
    this.handleMouseDown = this.handleMouseDown.bind(this);
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
        const height = this.state.height + event.movementY;
        if (height > 250) {
          this.setState({ height });
        }
      }
    };
    window.addEventListener('mousemove', this.handleMouseMove);
    window.addEventListener('mouseup', this.handleMouseUp);
  }

  componentWillUnmount() {
    window.removeEventListener('mousemove', this.handleMouseMove);
    window.removeEventListener('mouseup', this.handleMouseUp);
  }

  componentDidMount() {
    const el = findDOMNode(this.visDiv);
    el.setAttribute('render-counter', 'disabled');
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
        <div className="vis_editor__dirty_controls-toggle-label">Auto Apply</div>
        <div className="vis_editor__dirty_controls-toggle">
          <Toggle
            defaultChecked={autoApply}
            icons={false}
            onChange={this.props.onToggleAutoApply} />
        </div>
        <div className="vis_editor__dirty_controls-button">
          <button
            disabled={!dirty}
            onClick={this.props.onCommit}
            className={`${applyButtonClassName} md`}>
            <i className="fa fa-play"></i> Apply Changes</button>
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
          data-shared-item={true}
          ref={(el) => this.visDiv = el}
          className="vis_editor__visualization">
          <Visualization
            backgroundColor={visBackgroundColor}
            className="dashboard__visualization"
            model={this.props.model}
            onBrush={this.props.onBrush}
            onChange={this.handleChange}
            visData={this.props.visData} />
        </div>
        {applyButton}
        <div
          className="vis_editor__visualization-draghandle"
          onMouseDown={this.handleMouseDown}
          onMouseUp={this.handleMouseUp}>
          <i className="fa fa-ellipsis-h"></i>
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
  onToggleAutoApply: PropTypes.func,
  visData: PropTypes.object,
  dirty: PropTypes.bool,
  autoApply: PropTypes.bool
};

export default VisEditorVisualization;
