import { compose, withState, lifecycle, withPropsOnChange, withProps } from 'recompose';
import PropTypes from 'prop-types';
import { isEqual, cloneDeep } from 'lodash';
import { RenderElement as Component } from './render_element';
import { ElementHandlers } from './lib/handlers';
import { notify } from '../../lib/notify';

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
    componentDidMount() {
      this.firstRender = true;
      this.renderTarget = null;
    },

    componentWillReceiveProps({ domNode, renderFn }) {
      const newDomNode = domNode && this.props.domNode !== domNode;
      const newRenderFunction = renderFn !== this.props.renderFn;

      if (newDomNode || newRenderFunction) this.resetRenderTarget(domNode);
    },

    componentDidUpdate(prevProps) {
      const {
        handlers,
        domNode,
        config,
        size,
        renderFn,
        reuseNode,
        name: functionName,
      } = this.props;

      // Config changes
      if (this.shouldFullRerender(prevProps)) {
        // This should be the only place you call renderFn
        // TODO: We should wait until handlers.done() is called before replacing the element content?
        if (!reuseNode) this.resetRenderTarget(domNode);
        // else if (!firstRender) handlers.destroy();

        const renderConfig = cloneDeep(config);

        // TODO: this is hacky, but it works. it stops Kibana from blowing up when a render throws
        try {
          renderFn(this.renderTarget, renderConfig, handlers);
          this.firstRender = false;
        } catch (err) {
          console.error('renderFn threw', err);
          notify.error(`Rendering ${functionName || 'function'} failed: ${err}`);
        }
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

    resetRenderTarget(domNode) {
      const { handlers } = this.props;

      if (!domNode) throw new Error('RenderElement can not reset undefined target node');

      // call destroy on existing element
      if (!this.firstRender) handlers.destroy();

      while(domNode.firstChild) {
        domNode.removeChild(domNode.firstChild);
      }

      this.firstRender = true;
      this.renderTarget = this.createRenderTarget();
      domNode.appendChild(this.renderTarget);
    },

    createRenderTarget() {
      const div = document.createElement('div');
      div.style.width = '100%';
      div.style.height = '100%';
      return div;
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
  name: PropTypes.string,
  renderFn: PropTypes.func.isRequired,
  reuseNode: PropTypes.bool,
  handlers: PropTypes.object,
  destroyFn: PropTypes.func,
  config: PropTypes.object,
  size: PropTypes.object,
  css: PropTypes.string,
};
