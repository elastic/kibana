import React from 'react';
import Visualization from './visualization';
export default React.createClass({

  getInitialState() {
    return { height: 250, dragging: false };
  },

  handleMouseDown(e) {
    this.setState({ dragging: true });
  },

  handleMouseUp(e) {
    this.setState({ dragging: false });
  },

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
  },

  componentWillUnmount() {
    window.removeEventListener('mousemove', this.handleMouseMove);
    window.removeEventListener('mouseup', this.handleMouseUp);
  },

  render() {
    const { model, data } = this.props;
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
            onChange={this.handleChange}
            {...this.props}/>
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
});
