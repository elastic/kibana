import React, { Component, PropTypes } from 'react';
import Visualization from './visualization';

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

  handleMouseDown(e) {
    this.setState({ dragging: true });
  }

  handleMouseUp(e) {
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

  render() {
    const style = { height: this.state.height };
    if (this.state.dragging) {
      style.userSelect = 'none';
    }
    const visBackgroundColor = '#FFF';
    return (
      <div>
        <div style={style} className="vis_editor__visualization">
          <Visualization
            backgroundColor={visBackgroundColor}
            className="dashboard__visualization"
            model={this.props.model}
            onBrush={this.props.onBrush}
            onChange={this.handleChange}
            visData={this.props.visData} />
        </div>
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
  model    : PropTypes.object,
  onBrush  : PropTypes.func,
  onChange : PropTypes.func,
  visData  : PropTypes.object
};

export default VisEditorVisualization;
