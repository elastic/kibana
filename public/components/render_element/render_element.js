import React from 'react';
import PropTypes from 'prop-types';
import { lifecycle, compose } from 'recompose';
import { isEqual } from 'lodash';

export const RenderElementComponent = ({ renderFn, size, domNode, setDomNode }) => {
  const renderElement = (refNode) => {
    // Initialize the domNode property. This should only happen once, even if config changes.
    if (refNode && !domNode) {
      setDomNode(refNode);
      renderFn(refNode);
    }
  };

  return (
    <div className="canvas__workpad--element_render">
      <div style={size} ref={renderElement} />
    </div>
  );
};

const RenderElementLifecycle = lifecycle({
  componentDidMount() {
    console.log('mounty!');
  },

  componentDidUpdate(prevProps) {
    const { events, config, domNode, size } = this.props;
    if (!isEqual(config, prevProps.config)) {
      this.destroy();
      return this.props.renderFn(domNode);
    }

    if (!isEqual(size, prevProps.size)) return events.emit('resize', size);
  },

  shouldComponentUpdate(nextProps) {
    // TODO: What a shitty hack. None of these props should update when you move the element.
    // This should be fixed at a higher level.
    return !isEqual(this.props.config, nextProps.config) || !isEqual(this.props.size, nextProps.size);
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
};

export const RenderElement = compose(
  RenderElementLifecycle
)(RenderElementComponent);
