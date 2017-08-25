import { compose, withState, lifecycle, withProps } from 'recompose';
import { RenderElement as Component } from './render_element';
import PropTypes from 'prop-types';
import { isEqual } from 'lodash';
import { ElementHandlers } from './lib/handlers';

export const RenderElement = compose(
  withState('domNode', 'setDomNode'), // Still don't like this, seems to be the only way todo it.
  withProps({
    handlers: (function () {
      const handlers = new ElementHandlers();
      handlers.done = () => {};
      return handlers;
    }()),
  }),
  lifecycle({
    componentDidUpdate(prevProps) {
      const { handlers, config, domNode, size, renderFn } = this.props;

      // Config changes
      if (this.shouldFullRerender(prevProps)) {
        this.props.handlers.e.destroy();
        return renderFn(domNode, config, handlers);
      }

      // Size changes
      if (!isEqual(size, prevProps.size)) return handlers.e.resize(size);
    },

    shouldComponentUpdate(prevProps) {
      return this.shouldFullRerender(prevProps) || !isEqual(this.props.size, prevProps.size);
    },

    componentWillUnmount() {
      this.props.handlers.e.destroy();
    },

    shouldFullRerender(prevProps) {
      // TODO: What a shitty hack. None of these props should update when you move the element.
      // This should be fixed at a higher level.
      return !isEqual(this.props.config, prevProps.config) ||
      !isEqual(this.props.domNode, prevProps.domNode) ||
      !isEqual(this.props.renderFn.toString(), prevProps.renderFn.toString());
    },

    destroy() {
      this.props.handlers.e.destroy();
    },
  }),
)(Component);

RenderElement.propTypes = {
  renderFn: PropTypes.func.isRequired,
  destroyFn: PropTypes.func,
  config: PropTypes.object,
  size: PropTypes.object,
  css: PropTypes.string,
};
