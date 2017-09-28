import { compose, withState, lifecycle, withPropsOnChange, withProps } from 'recompose';
import { RenderElement as Component } from './render_element';
import PropTypes from 'prop-types';
import { isEqual, cloneDeep } from 'lodash';
import { ElementHandlers } from './lib/handlers';

export const RenderElement = compose(
  withState('domNode', 'setDomNode'), // Still don't like this, seems to be the only way todo it.
  withPropsOnChange(() => false, () => ({
    elementHandlers: new ElementHandlers(),
  })),
  withProps(({ handlers, elementHandlers }) => ({
    handlers: Object.assign(
      elementHandlers,
      handlers,
      { done: () => {} },
    ),
  })),
  lifecycle({
    componentDidUpdate(prevProps) {
      const { handlers, config, domNode, size, renderFn } = this.props;

      // Config changes
      if (this.shouldFullRerender(prevProps)) {
        handlers.destroy();
        return renderFn(domNode, cloneDeep(config), handlers);
      }

      // Size changes
      if (!isEqual(size, prevProps.size)) return handlers.resize(size);
    },

    shouldComponentUpdate(prevProps) {
      return !isEqual(this.props.size, prevProps.size) || this.shouldFullRerender(prevProps);
    },

    componentWillUnmount() {
      this.props.handlers.destroy();
    },

    shouldFullRerender(prevProps) {
      // TODO: What a shitty hack. None of these props should update when you move the element.
      // This should be fixed at a higher level.
      return !isEqual(this.props.config, prevProps.config) ||
      !isEqual(this.props.domNode, prevProps.domNode) ||
      !isEqual(this.props.renderFn.toString(), prevProps.renderFn.toString());
    },

    destroy() {
      this.props.handlers.destroy();
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
