import PropTypes from 'prop-types';
import React from 'react';

const Row = ({ children, align }) => {
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
  }

  return <div className={`tsvb-grid ${alignCSS}`}>{children}</div>;
};

Row.propTypes = {
  align: PropTypes.string
};
export default Row;
