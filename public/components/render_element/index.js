import { pure, compose, withProps, withState } from 'recompose';
import { RenderElement as Component } from './render_element';
import PropTypes from 'prop-types';
import { Events } from '../../lib/events';

const events = new Events();
export const RenderElement = compose(
  pure,
  withProps(({ renderFn, done, config, size }) => ({
    renderFn: (domNode) => {
      renderFn(domNode, config, done || (() => {}), events);
    },
    destroyFn: () => {
      events.emit('destroy');
    },
    events: events,
    size,
  })),
  withState('domNode', 'setDomNode'),
)(Component);

RenderElement.propTypes = {
  renderFn: PropTypes.func.isRequired,
  destroyFn: PropTypes.func,
  done: PropTypes.func,
  config: PropTypes.object,
  size: PropTypes.object,
};
