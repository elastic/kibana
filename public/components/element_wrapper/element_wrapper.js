import React from 'react';
import PropTypes from 'prop-types';
import { Positionable } from '../positionable';
import { ElementControls } from './element_controls';

export class ElementWrapper extends React.PureComponent {
  static propTypes = {
    selectElement: PropTypes.func.isRequired,
    removeElement: PropTypes.func.isRequired,
    isSelected: PropTypes.bool,
    state: PropTypes.string,
    error: PropTypes.object,
    renderable: PropTypes.object,
    position: PropTypes.object.isRequired,
    setPosition: PropTypes.func.isRequired,
    createHandlers: PropTypes.func.isRequired,
  };

  state = {
    handlers: null,
  };

  componentDidMount() {
    // create handlers when component mounts, so it only creates one instance
    const { createHandlers } = this.props;
    // eslint-disable-next-line react/no-did-mount-set-state
    this.setState({ handlers: createHandlers() });
  }

  render() {
    // wait until the handlers have been created
    if (!this.state.handlers) return null;

    const {
      selectElement,
      removeElement,
      isSelected,
      renderable,
      position,
      setPosition,
      state,
    } = this.props;

    return (
      <Positionable position={position} onChange={setPosition} interact={isSelected}>
        {/*
          This is why we need this janky ElementControls thing:

          Size will be passed to PositionableChild by Positionable
          size={{ width: position.width, height: position.height }}

          This keeps things fast, allowing Positionable to maintain a cache of the state without
          writing it back to redux.

          Its crap, I agree. I'm open to better solutions.
        */}
        <ElementControls
          selectElement={selectElement}
          removeElement={removeElement}
          isSelected={isSelected}
          renderable={renderable}
          state={state}
          handlers={this.state.handlers}
        />
      </Positionable>
    );
  }
}
