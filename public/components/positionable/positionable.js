import React from 'react';
import $ from 'jquery';
import {move, resize, rotate, remove} from './interaction';
import './positionable.less';

export default React.createClass({
  componentDidMount() {
    const elem = $(this.refs.positionableWrapper);
    move(elem, {
      on: this.props.move
    });

    rotate(elem, {
      on: this.props.rotate,
      handle: '.reframe--positionable-rotate-handle'
    });

    resize(elem, {
      on: this.props.resize,
      sides: {
        left:   '.reframe--positionable-resize-nw, .reframe--positionable-resize-sw, .reframe--positionable-resize-w',
        top:    '.reframe--positionable-resize-nw, .reframe--positionable-resize-ne, .reframe--positionable-resize-n',
        right:  '.reframe--positionable-resize-ne, .reframe--positionable-resize-se, .reframe--positionable-resize-e',
        bottom: '.reframe--positionable-resize-sw, .reframe--positionable-resize-se, .reframe--positionable-resize-s'
      }
    });
  },
  render() {
    const { children, position } = this.props;

    const newChildren = React.Children.map(children, (child) => {
      const newStyle = {
        position: 'absolute',
        transform: `rotate(${position.angle}deg)`,
        height: position.height,
        width: position.width,
        top: position.top,
        left: position.left
      };
      return (
        <div className="rework--positionable"
          ref="positionableWrapper"
          style={newStyle}>
          <div className="reframe--positionable-actions">
            <div className="reframe--positionable-action reframe--positionable-rotate-handle">
              <i className="fa fa-undo reframe--positionable-rotate-handle"></i>
            </div>
          </div>

          <div className="reframe--positionable-resize reframe--positionable-resize-nw"></div>
          <div className="reframe--positionable-resize reframe--positionable-resize-ne"></div>
          <div className="reframe--positionable-resize reframe--positionable-resize-se"></div>
          <div className="reframe--positionable-resize reframe--positionable-resize-sw"></div>
          <div className="reframe--positionable-resize reframe--positionable-resize-n"></div>
          <div className="reframe--positionable-resize reframe--positionable-resize-e"></div>
          <div className="reframe--positionable-resize reframe--positionable-resize-s"></div>
          <div className="reframe--positionable-resize reframe--positionable-resize-w"></div>

          {child}
        </div>
      );
    });

    return (
      <div>{newChildren}</div>
    );
  }
});
