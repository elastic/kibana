import React from 'react';
import PropTypes from 'prop-types';

export const RenderElement = ({ domNode, setDomNode }) => {
  const linkRef = (refNode) => {
    if (!domNode && refNode) {
      // Initialize the domNode property. This should only happen once, even if config changes.
      setDomNode(refNode);
    }
  };

  return (
    <div
      className="canvas__workpad--element_render canvas__element"
      style={{ height: '100%', width: '100%' }}
      ref={linkRef}
    />
  );
};

RenderElement.propTypes = {
  domNode: PropTypes.object,
  setDomNode: PropTypes.func,
};
