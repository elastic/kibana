import React from 'react';
import $ from 'jquery';
import _ from 'lodash';
import {move, resize, rotate, remove} from './interaction';
import './positionable.less';

export default class Positionable extends React.PureComponent {
  constructor(props) {    /* Note props is passed into the constructor in order to be used */
    super(props);
    const {position} = props;
    this.state = position;
  }

  attachHandlers(ref) {
    const elem = $(ref);

    const stateMoveOrResize = (e) => {
      const {top, left, height, width} = e.interaction.absolute;
      this.setState({top, left, height, width});
    };

    const stateRotate = (e) => {
      const {angle} = e.interaction.absolute;
      this.setState({angle});
    };

    move(elem, {
      on: (e) => stateMoveOrResize(e),
      onEnd: (e) => this.props.move(e)
    });

    rotate(elem, {
      on: (e) => stateRotate(e),
      onEnd: (e) => this.props.rotate(e),
      handle: '.rework--interactable-rotate-handle'
    });

    const debouncedResize = _.debounce(this.props.resize, 50, {maxWait: 50});

    resize(elem, {
      on: (e) => { stateMoveOrResize(e); debouncedResize(e); },
      onEnd: (e) => this.props.resize(e),
      sides: {
        left:   '.rework--interactable-resize-nw, .rework--interactable-resize-sw, .rework--interactable-resize-w',
        top:    '.rework--interactable-resize-nw, .rework--interactable-resize-ne, .rework--interactable-resize-n',
        right:  '.rework--interactable-resize-ne, .rework--interactable-resize-se, .rework--interactable-resize-e',
        bottom: '.rework--interactable-resize-sw, .rework--interactable-resize-se, .rework--interactable-resize-s'
      }
    });
  }

  removeHandlers(elem) {
    remove($(elem));
  }

  componentWillUpdate(nextProps, nextState) {
    // This is gross and hacky but is needed to make updating state from props smooth.
    if (_.isEqual(this.state, nextState) && !_.isEqual(nextProps.position, this.state)) this.setState(nextProps.position);
  }

  componentDidUpdate(prevProps) {
    // If interactions have been enabled/disabled, attach/remove handlers.
    if (prevProps.interact && !this.props.interact) {
      this.removeHandlers(this.refs.positionableWrapper);
    }

    if (!prevProps.interact && this.props.interact) {
      this.attachHandlers(this.refs.positionableWrapper);
    }
  }

  componentDidMount() {
    if (this.props.interact) this.attachHandlers(this.refs.positionableWrapper);
  }

  componentWillUnmount() {
    this.removeHandlers(this.refs.positionableWrapper);
  }

  render() {
    const { children, position, rotate, resize, style, interact } = this.props;

    const {top, left, height, width, angle} = this.state;

    const wrappedChildren = React.Children.map(children, (child) => {
      const newStyle = {
        ...style,
        position: 'absolute',
        transform: `rotate(${angle}deg)`,// translate(${position.left}px, ${position.top}px)`,
        height: height,
        width: width,
        top: top,
        left: left,
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
};
