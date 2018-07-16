import React from 'react';
import PropTypes from 'prop-types';
import aero from '../../lib/aeroelastic';

export const Positionable = ({ children, transformMatrix, a, b }) => {
  // Throw if there is more than one child
  React.Children.only(children);
  // This could probably be made nicer by having just one child
  const wrappedChildren = React.Children.map(children, child => {
    const newStyle = {
      width: a * 2,
      height: b * 2,
      marginLeft: -a,
      marginTop: -b,
      position: 'absolute',
      transform: aero.dom.matrixToCSS(transformMatrix.map((n, i) => (i < 12 ? n : Math.round(n)))),
    };

    const stepChild = React.cloneElement(child, { size: { width: a * 2, height: b * 2 } });
    return (
      <div className="canvas__positionable canvas__interactable" style={newStyle}>
        {stepChild}
      </div>
    );
  });

  return wrappedChildren;
};

Positionable.propTypes = {
  onChange: PropTypes.func,
  children: PropTypes.element.isRequired,
  transformMatrix: PropTypes.arrayOf(PropTypes.number).isRequired,
  a: PropTypes.number.isRequired,
  b: PropTypes.number.isRequired,
};
