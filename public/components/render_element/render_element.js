import React from 'react';
import PropTypes from 'prop-types';
import { lifecycle, compose } from 'recompose';

export const RenderElementComponent = ({ renderFn }) => {
  const renderElement = (domNode) => {
    if (domNode) renderFn(domNode);
  };

  const style = { height: '500px', width: '700px' };

  return (
    <div className="canvas__workpad--element_render" style={style}>
      <div style={style} ref={renderElement} />
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
};

export const RenderElement = compose(
  RenderElementLifecycle
)(RenderElementComponent);
