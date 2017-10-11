import PropTypes from 'prop-types';
import React from 'react';

const Cell = ({ children, align, size }) => {
  let alignCSS = 'tsvb-grid-cell';
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
    default:
      alignCSS = '';
      break;
  }

  let sizeCSS = 'tsvb-grid-cell';
  switch (size) {
    case 'full':
      sizeCSS = `${sizeCSS}-full`;
      break;
    case '1/2':
      sizeCSS = `${sizeCSS}-1of2`;
      break;
    case '1/3':
      sizeCSS = `${sizeCSS}-1of3`;
      break;
    case '2/3':
      sizeCSS = `${sizeCSS}-2of3`;
      break;
    case '1/4':
      sizeCSS = `${sizeCSS}-1of4`;
      break;
    case '3/4':
      sizeCSS = `${sizeCSS}-3of4`;
      break;
    case '1/5':
      sizeCSS = `${sizeCSS}-1of5`;
      break;
    case '1/6':
      sizeCSS = `${sizeCSS}-1of6`;
      break;
    case 'fit':
      sizeCSS = `${sizeCSS}--fit`;
      break;
    default:
      sizeCSS = '';
      break;
  }

  if (size && size !== 'auto') {
    sizeCSS = `tsvb-grid-cell-of ${sizeCSS}`;
  }

  return <div className={`tsvb-grid-cell ${sizeCSS} ${alignCSS}`}>{children}</div>;
};

Grid.propTypes = {
  align: PropTypes.string,
  size: PropTypes.string
};
export default Cell;
