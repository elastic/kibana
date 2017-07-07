import React from 'react';
import PropTypes from 'prop-types';
import { lifecycle, compose } from 'recompose';
import { isEqual } from 'lodash';

export const RenderElementComponent = ({ renderFn, size }) => {
  const renderElement = (domNode) => {
    console.log('rendering');
    if (domNode) renderFn(domNode);
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

  shouldComponentUpdate(nextProps) {
    // TODO: What a shitty hack. None of these props should update when you move the element.
    // This should be fixed at a higher level.
    return !isEqual(this.props.config, nextProps.config); //|| !isEqual(this.props.size, nextProps.size);
  },

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
