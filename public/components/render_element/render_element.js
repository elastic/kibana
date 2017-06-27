import React from 'react';
import PropTypes from 'prop-types';
import { lifecycle, compose } from 'recompose';

export const RenderElementComponent = ({ renderFn, size }) => {
  const renderElement = (domNode) => {
    if (domNode) renderFn(domNode);
  };

  return (
    <div className="canvas__workpad--element_render">
      <div style={size} ref={renderElement} />
    </div>
  );
};

const RenderElementLifecycle = lifecycle({
  componentWillUnmount() {
    this.props.destroyFn();
  },
});

RenderElementComponent.propTypes = {
  renderFn: PropTypes.func,
  destroyFn: PropTypes.func,
  size: PropTypes.object,
};

export const RenderElement = compose(
  RenderElementLifecycle
)(RenderElementComponent);
