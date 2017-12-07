import React from 'react';
import PropTypes from 'prop-types';

export const Changes = ({ changes }) => {
  if (!changes) return null;

  return (
    <div dangerouslySetInnerHTML={{ __html: changes }} />
  );
};

Changes.propTypes = {
  changes: PropTypes.string,
};
