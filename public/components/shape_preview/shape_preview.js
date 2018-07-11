import React from 'react';
import PropTypes from 'prop-types';
import { shapes } from '../../render_functions/shape/shapes';

export const ShapePreview = ({ value }) => {
  return <div className="canvasShapePreview" dangerouslySetInnerHTML={{ __html: shapes[value] }} />;
};

ShapePreview.propTypes = {
  value: PropTypes.string,
};
