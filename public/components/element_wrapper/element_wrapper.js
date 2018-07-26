import React from 'react';
import PropTypes from 'prop-types';
import { Positionable } from '../positionable';
import { ElementContent } from '../element_content';

export class ElementWrapper extends React.PureComponent {
  static propTypes = {
    renderable: PropTypes.object,
    transformMatrix: PropTypes.arrayOf(PropTypes.number).isRequired,
    a: PropTypes.number.isRequired,
    b: PropTypes.number.isRequired,
    state: PropTypes.string,
    createHandlers: PropTypes.func.isRequired,
    selected: PropTypes.bool,
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

    const { selected, renderable, transformMatrix, a, b, state } = this.props;

    return (
      <Positionable transformMatrix={transformMatrix} a={a} b={b}>
        <ElementContent
          selected={selected}
          renderable={renderable}
          state={state}
          handlers={this.state.handlers}
        />
      </Positionable>
    );
  }
}
