import React from 'react';
import PropTypes from 'prop-types';
import $ from 'jquery';
import _ from 'lodash';
import { move, resize, rotate, remove } from './interaction';
import { lifecycle, compose } from 'recompose';

import './positionable.less';

let wrapperNode;

const PositionableLifecycle = lifecycle({
  componentWillUnmount() {
    this.removeHandlers(wrapperNode);
  },

  componentWillUpdate(nextProps, nextState) {
    // This is gross and hacky but is needed to make updating state from props smooth.
    if (_.isEqual(this.state, nextState) && !_.isEqual(nextProps.position, this.state)) this.setState(nextProps.position);
  },

  componentDidUpdate(prevProps) {
    // If interactions have been enabled/disabled, attach/remove handlers.
    if (prevProps.interact && !this.props.interact) {
      this.removeHandlers(wrapperNode);
    }

    if (!prevProps.interact && this.props.interact) {
      this.attachHandlers(wrapperNode);
    }
  },

  componentDidMount() {
    if (this.props.interact) this.attachHandlers(wrapperNode);
  },

  removeHandlers(elem) {
    remove($(elem));
  },

  attachHandlers(ref) {
    const { onChange, setPosition } = this.props;
    const elem = $(ref);

    const stateMoveOrResize = (e) => {
      const { top, left, height, width } = e.interaction.absolute;
      setPosition(Object.assign({}, this.props.position, { top, left, height, width }));
    };

    const stateRotate = (e) => {
      const { angle } = e.interaction.absolute;
      setPosition(Object.assign({}, this.props.position, { angle }));
    };

    move(elem, {
      on: (e) => stateMoveOrResize(e),
      onEnd: () => onChange(this.props.position),
    });

    rotate(elem, {
      on: (e) => stateRotate(e),
      onEnd: () => onChange(this.props.position),
      handle: '.rework--interactable-rotate-handle',
    });

    resize(elem, {
      on: (e) => stateMoveOrResize(e),
      onEnd: () => onChange(this.props.position),
      sides: {
        left:   '.rework--interactable-resize-nw, .rework--interactable-resize-sw, .rework--interactable-resize-w',
        top:    '.rework--interactable-resize-nw, .rework--interactable-resize-ne, .rework--interactable-resize-n',
        right:  '.rework--interactable-resize-ne, .rework--interactable-resize-se, .rework--interactable-resize-e',
        bottom: '.rework--interactable-resize-sw, .rework--interactable-resize-se, .rework--interactable-resize-s',
      },
    });
  },

});

const PositionableComponent = ({ position, children, interact  }) => {
  function setWrapperNode(domNode) {
    wrapperNode = domNode;
  }

  const { top, left, height, width, angle } = position;

  // This could probably be made nicer by having just one child
  const wrappedChildren = React.Children.map(children, (child) => {
    // TODO: Throw if there is more thean one child
    const newStyle = {
      position: 'absolute',
      transform: `rotate(${angle}deg)`,// translate(${position.left}px, ${position.top}px)`,
      height: height,
      width: width,
      top: top,
      left: left,
    };

    if (!interact) {
      return (
        <div className="rework--positionable"
          ref={setWrapperNode}
          style={newStyle}>
          {child}
        </div>
      );
    } else {
      return (
        <div className="rework--positionable rework--interactable"
          ref={setWrapperNode}
          style={newStyle}>
          <div className="rework--interactable-actions">
            <div className="rework--interactable-action rework--interactable-rotate-handle">
              <i className="fa fa-undo rework--interactable-rotate-handle"/>
            </div>
          </div>

          <div className="rework--interactable-meta"/>

          {child}

          <div className="rework--interactable-resize rework--interactable-resize-nw"/>
          <div className="rework--interactable-resize rework--interactable-resize-ne"/>
          <div className="rework--interactable-resize rework--interactable-resize-se"/>
          <div className="rework--interactable-resize rework--interactable-resize-sw"/>
          <div className="rework--interactable-resize rework--interactable-resize-n"/>
          <div className="rework--interactable-resize rework--interactable-resize-e"/>
          <div className="rework--interactable-resize rework--interactable-resize-s"/>
          <div className="rework--interactable-resize rework--interactable-resize-w"/>
        </div>
      );
    }
  });

  return (
    <div>{wrappedChildren}</div>
  );
};

PositionableComponent.propTypes = {
  interact: PropTypes.bool,
  onChange: PropTypes.func,
  setPosition: PropTypes.func,
  position: PropTypes.object,
  children: PropTypes.node,
};

export const Positionable = compose(
  PositionableLifecycle,
)(PositionableComponent);
