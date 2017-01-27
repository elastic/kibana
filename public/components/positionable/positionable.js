import React from 'react';
import $ from 'jquery';
import {move, resize, rotate, remove} from './interaction';
import './positionable.less';

export default React.createClass({
  attachHandlers(ref) {
    const elem = $(ref);

    move(elem, {
      on: this.props.move
    });

    rotate(elem, {
      on: this.props.rotate,
      handle: '.rework--interactable-rotate-handle'
    });

    resize(elem, {
      on: this.props.resize,
      sides: {
        left:   '.rework--interactable-resize-nw, .rework--interactable-resize-sw, .rework--interactable-resize-w',
        top:    '.rework--interactable-resize-nw, .rework--interactable-resize-ne, .rework--interactable-resize-n',
        right:  '.rework--interactable-resize-ne, .rework--interactable-resize-se, .rework--interactable-resize-e',
        bottom: '.rework--interactable-resize-sw, .rework--interactable-resize-se, .rework--interactable-resize-s'
      }
    });
  },
  removeHandlers(elem) {
    remove($(elem));
  },
  componentWillUpdate(nextProps) {
    if (this.props.interact && !nextProps.interact) this.removeHandlers(this.refs.positionableWrapper);
    if (!this.props.interact && nextProps.interact) this.attachHandlers(this.refs.positionableWrapper);
  },
  componentDidMount() {
    if (this.props.interact) this.attachHandlers(this.refs.positionableWrapper);
  },
  componentWillUnmount() {
    this.removeHandlers(this.refs.positionableWrapper);
  },
  render() {
    const { children, position, rotate, resize, style, interact } = this.props;

    const wrappedChildren = React.Children.map(children, (child) => {
      const newStyle = {
        ...style,
        position: 'absolute',
        transform: `rotate(${position.angle}deg)`,// translate(${position.left}px, ${position.top}px)`,
        height: position.height,
        width: position.width,
        top: position.top,
        left: position.left,
      };

      if (!interact) {
        return (
          <div className='rework--positionable'
            ref="positionableWrapper"
            style={newStyle}>
            {child}
          </div>
        );
      } else {
        return (
          <div className='rework--positionable rework--interactable'
            ref="positionableWrapper"
            style={newStyle}>
            <div className="rework--interactable-actions">
              <div className="rework--interactable-action rework--interactable-rotate-handle">
                <i className="fa fa-undo rework--interactable-rotate-handle"></i>
              </div>
            </div>

            <div className="rework--interactable-meta"></div>

            {child}

            <div className="rework--interactable-resize rework--interactable-resize-nw"></div>
            <div className="rework--interactable-resize rework--interactable-resize-ne"></div>
            <div className="rework--interactable-resize rework--interactable-resize-se"></div>
            <div className="rework--interactable-resize rework--interactable-resize-sw"></div>
            <div className="rework--interactable-resize rework--interactable-resize-n"></div>
            <div className="rework--interactable-resize rework--interactable-resize-e"></div>
            <div className="rework--interactable-resize rework--interactable-resize-s"></div>
            <div className="rework--interactable-resize rework--interactable-resize-w"></div>

          </div>
        );
      }
    });

    return (
      <div>{wrappedChildren}</div>
    );
  }
});
