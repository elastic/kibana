import PropTypes from 'prop-types';
import React from 'react';

const Grid = ({ children, align, gutter = true, isContainer = false, ...rest }) => {
  let alignCSS = 'tsvb-grid';
  switch (align) {
    case 'top':
      alignCSS = `${alignCSS}--top`;
      break;
    case 'bottom':
      alignCSS = `${alignCSS}--bottom`;

      break;
    case 'center':
      alignCSS = `${alignCSS}--center`;

      break;
    case 'justifyCenter':
      alignCSS = `${alignCSS}--justifyCenter`;
      break;
    default:
      alignCSS = '';
      break;
  }

  let gutterCSS = 'tsvb-grid';
  switch (gutter) {
    case true:
    case 'regular':
      gutterCSS = `${gutterCSS}--gutters`;
      break;
    case 'lg':
      gutterCSS = `${gutterCSS}--guttersLg`;
      break;
    case 'x-lg':
      gutterCSS = `${gutterCSS}--guttersXl`;
      break;
    case false:
      gutterCSS = '';
      break;
  }

  return (
    <div {...rest} className={`tsvb-grid ${alignCSS} ${gutterCSS} ${isContainer ? 'vis_editor__series_config-container' : ''}`}>
      {children}
    </div>
  );
};

Grid.propTypes = {
  align: PropTypes.string,
  gutter: PropTypes.string
};
export default Grid;
