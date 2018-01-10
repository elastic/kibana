import React from 'react';
import PropTypes from 'prop-types';
import { lifecycle, compose } from 'recompose';
import $ from 'jquery';
import { move, resize, rotate, remove } from './interaction';
import './positionable.less';

let wrapperNode;

const PositionableLifecycle = lifecycle({
  componentWillUnmount() {
    this.removeHandlers(wrapperNode);
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

    const stateMoveOrResize = e => {
      const { top, left, height, width } = e.interaction.absolute;
      setPosition({ ...this.props.position, top, left, height, width });
    };

    const stateRotate = e => {
      const { angle } = e.interaction.absolute;
      setPosition({ ...this.props.position, angle });
    };

    move(elem, {
      on: e => stateMoveOrResize(e),
      onEnd: () => onChange(this.props.position),
    });

    rotate(elem, {
      on: e => stateRotate(e),
      onEnd: () => onChange(this.props.position),
      handle: '.canvas--interactable-rotate-handle',
    });

    resize(elem, {
      on: e => stateMoveOrResize(e),
      onEnd: () => onChange(this.props.position),
      sides: {
        left:
          '.canvas--interactable-resize-nw, .canvas--interactable-resize-sw, .canvas--interactable-resize-w',
        top:
          '.canvas--interactable-resize-nw, .canvas--interactable-resize-ne, .canvas--interactable-resize-n',
        right:
          '.canvas--interactable-resize-ne, .canvas--interactable-resize-se, .canvas--interactable-resize-e',
        bottom:
          '.canvas--interactable-resize-sw, .canvas--interactable-resize-se, .canvas--interactable-resize-s',
      },
    });
  },
});

const PositionableComponent = ({ position, children, interact }) => {
  function setWrapperNode(domNode) {
    wrapperNode = domNode;
  }

  const { top, left, height, width, angle } = position;

  // This could probably be made nicer by having just one child
  const wrappedChildren = React.Children.map(children, child => {
    // TODO: Throw if there is more thean one child
    const newStyle = {
      position: 'absolute',
      transform: `rotate(${angle}deg)`, // translate(${position.left}px, ${position.top}px)`,
      height: height,
      width: width,
      top: top,
      left: left,
    };

    const stepChild = React.cloneElement(child, { size: { height, width } });

    return (
      <div
        className="canvas--positionable canvas--interactable"
        ref={setWrapperNode}
        style={newStyle}
      >
        {stepChild}

        {interact && (
          <div>
            <div className="canvas--interactable-actions">
              <div className="canvas--interactable-action canvas--interactable-rotate-handle">
                <i className="fa fa-undo canvas--interactable-rotate-handle" />
              </div>
            </div>

            <div className="canvas--interactable-meta" />

            <div className="canvas--interactable-resize canvas--interactable-resize-nw" />
            <div className="canvas--interactable-resize canvas--interactable-resize-ne" />
            <div className="canvas--interactable-resize canvas--interactable-resize-se" />
            <div className="canvas--interactable-resize canvas--interactable-resize-sw" />
            <div className="canvas--interactable-resize canvas--interactable-resize-n" />
            <div className="canvas--interactable-resize canvas--interactable-resize-e" />
            <div className="canvas--interactable-resize canvas--interactable-resize-s" />
            <div className="canvas--interactable-resize canvas--interactable-resize-w" />
          </div>
        )}
      </div>
    );
  });

  return <div>{wrappedChildren}</div>;
};

PositionableComponent.propTypes = {
  interact: PropTypes.bool,
  onChange: PropTypes.func,
  setPosition: PropTypes.func,
  position: PropTypes.object,
  children: PropTypes.node,
};

export const Positionable = compose(PositionableLifecycle)(PositionableComponent);
