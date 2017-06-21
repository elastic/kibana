import { pure, compose, withProps } from 'recompose';
import { RenderElement as Component } from './render_element';
import PropTypes from 'prop-types';

let cleanupContext;
export const RenderElement = compose(
  pure,
  withProps(({ renderFn, destroyFn, done, config }) => ({
    renderFn: (domNode) => {
      cleanupContext = renderFn(domNode, config, done || (() => {}));
    },
    destroyFn: () => {
      if (destroyFn) destroyFn(cleanupContext);
    },
  }))
)(Component);

RenderElement.propTypes = {
  renderFn: PropTypes.func.isRequired,
  destroyFn: PropTypes.func,
  done: PropTypes.func,
  config: PropTypes.object,
};
