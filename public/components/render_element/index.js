import { pure, compose, withState } from 'recompose';
import { RenderElement as Component } from './render_element';
import PropTypes from 'prop-types';

export const RenderElement = compose(
  pure,
  withState('domNode', 'setDomNode'),
  withState('events', 'setEventEmitter'),
)(Component);

RenderElement.propTypes = {
  renderFn: PropTypes.func.isRequired,
  destroyFn: PropTypes.func,
  done: PropTypes.func,
  config: PropTypes.object,
  size: PropTypes.object,
  css: PropTypes.string,
};
