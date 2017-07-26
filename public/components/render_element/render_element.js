import React from 'react';
import PropTypes from 'prop-types';
import { lifecycle, compose } from 'recompose';
import { isEqual } from 'lodash';
import { Events } from '../../lib/events';

export const RenderElementComponent = ({ domNode, setDomNode }) => {
  const linkRef = (refNode) => {
    if (!domNode && refNode) {
      // Initialize the domNode property. This should only happen once, even if config changes.
      setDomNode(refNode);
    }
  };

  return (
    <div className="canvas__workpad--element_render canvas__element" style={{ height: '100%', width: '100%' }} ref={linkRef} />
  );
};

const RenderElementLifecycle = lifecycle({

  componentWillMount() {
    if (!this.props.events) {
      const _events = new Events();
      this.props.setEventEmitter(_events);
    }
  },

  componentDidUpdate(prevProps) {
    const { events, config, domNode, done, size, renderFn } = this.props;

    // Config changes
    if (
      !isEqual(config, prevProps.config) ||
      !isEqual(renderFn, prevProps.renderFn) ||
      !isEqual(events, prevProps.events)
    ) {
      this.destroy();
      return renderFn(domNode, config, done || (() => {}), events);
    }

    // Size changes
    if (!isEqual(size, prevProps.size)) return events.emit('resize', size);

    // CSS changes, don't do squat. React's job.
  },

  shouldComponentUpdate({ config, size, renderFn, events }) {
    // TODO: What a shitty hack. None of these props should update when you move the element.
    // This should be fixed at a higher level.
    return !isEqual(this.props.config, config) ||
      !isEqual(this.props.size, size) ||
      !isEqual(this.props.renderFn.toString(), renderFn.toString()) ||
      !isEqual(this.props.events, events);
  },

  componentWillUnmount() {
    this.destroy();
  },

  destroy() {
    const { events } = this.props;
    events.emit('destroy');

    // TODO: This should be cleaned up in RenderElement;
    events.off('destroy');
    events.off('resize');
  },
});

RenderElementComponent.propTypes = {
  renderFn: PropTypes.func,
  destroyFn: PropTypes.func,
  domNode: PropTypes.object,
  setDomNode: PropTypes.func,
  size: PropTypes.object,
  events: PropTypes.object,
  setEventEmitter: PropTypes.func,
};

export const RenderElement = compose(
  RenderElementLifecycle
)(RenderElementComponent);
