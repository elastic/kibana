import React from 'react';
import PropTypes from 'prop-types';
import { lifecycle, compose } from 'recompose';
import { isEqual } from 'lodash';
import { Events } from '../../lib/events';
import Style from 'style-it';

export const RenderElementComponent = ({ renderFn, size, domNode, setDomNode, setEventEmitter, css }) => {
  const renderElement = (refNode) => {
    if (refNode && !domNode) {

      // TODO: OMG this is so gross, but it works. I tried passing it in from the container,
      // but it kept getting recreated and would get out of sync with what the render function had subscribed to.
      const _events = new Events();
      setEventEmitter(_events);

      // Initialize the domNode property. This should only happen once, even if config changes.
      setDomNode(refNode);
      renderFn(refNode, _events);
    }
  };

  return Style.it(css,
    <div className="canvas__workpad--element_render canvas__element">
      <div style={size} ref={renderElement} />
    </div>
  );
};

const RenderElementLifecycle = lifecycle({

  componentDidUpdate(prevProps) {
    const { events, config, domNode, size, renderFn } = this.props;

    // Config changes
    if (!isEqual(config, prevProps.config) || !isEqual(renderFn, prevProps.renderFn)) {
      this.destroy();
      return renderFn(domNode, events);
    }

    // Size changes
    if (!isEqual(size, prevProps.size)) return events.emit('resize', size);

    // CSS changes, don't do squat. React's job.
  },

  shouldComponentUpdate(nextProps) {
    // TODO: What a shitty hack. None of these props should update when you move the element.
    // This should be fixed at a higher level.
    return !isEqual(this.props.config, nextProps.config) ||
      !isEqual(this.props.size, nextProps.size) ||
      !isEqual(this.props.renderFn, nextProps.renderFn) ||
      !isEqual(this.props.css, nextProps.css);
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
  css: PropTypes.string,
};

export const RenderElement = compose(
  RenderElementLifecycle
)(RenderElementComponent);
