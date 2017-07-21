import { pure, compose, withProps, withState } from 'recompose';
import { RenderElement as Component } from './render_element';
import PropTypes from 'prop-types';

export const RenderElement = compose(
  pure,
  withProps(({ renderFn, done, config, size, css }) => ({
    renderFn: (domNode, events) => {
      renderFn(domNode, config, done || (() => {}), events);
    },
    size,
    css,
  })),
  withState('domNode', 'setDomNode'),
  withState('events', 'setEventEmitter'),
)(Component);

RenderElement.propTypes = {
  renderFn: PropTypes.func.isRequired,
  done: PropTypes.func,
  config: PropTypes.object,
  size: PropTypes.object,
  css: PropTypes.string,
};
