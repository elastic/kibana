import { compose, withState, lifecycle, withProps } from 'recompose';
import { RenderElement as Component } from './render_element';
import PropTypes from 'prop-types';
import { isEqual } from 'lodash';
import { Events } from '../../lib/events';

export const RenderElement = compose(
  withState('domNode', 'setDomNode'), // Still don't like this, seems to be the only way todo it.
  withProps({ events: new Events() }),
  lifecycle({
    componentDidUpdate(prevProps) {
      const { events, config, domNode, done, size, renderFn } = this.props;

      // Config changes
      if (this.shouldFullRerender(prevProps)) {
        this.destroy();
        return renderFn(domNode, config, done || (() => {}), events);
      }

      // Size changes
      if (!isEqual(size, prevProps.size)) return events.emit('resize', size);
    },

    shouldComponentUpdate(prevProps) {
      return this.shouldFullRerender(prevProps) || !isEqual(this.props.size, prevProps.size);
    },

    componentWillUnmount() {
      this.destroy();
    },

    shouldFullRerender(prevProps) {
      // TODO: What a shitty hack. None of these props should update when you move the element.
      // This should be fixed at a higher level.
      return !isEqual(this.props.config, prevProps.config) ||
      !isEqual(this.props.domNode, prevProps.domNode) ||
      !isEqual(this.props.renderFn.toString(), prevProps.renderFn.toString());
    },

    destroy() {
      const { events } = this.props;
      events.emit('destroy');

      events.off('destroy');
      events.off('resize');
    },
  }),
)(Component);

RenderElement.propTypes = {
  renderFn: PropTypes.func.isRequired,
  destroyFn: PropTypes.func,
  done: PropTypes.func,
  config: PropTypes.object,
  size: PropTypes.object,
  css: PropTypes.string,
};
