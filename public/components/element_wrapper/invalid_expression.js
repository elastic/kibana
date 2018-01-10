import React from 'react';
import PropTypes from 'prop-types';

export const InvalidExpression = ({ selectElement }) => (
  <h3 onClick={selectElement}>Invalid expression</h3>
);

InvalidExpression.propTypes = {
  selectElement: PropTypes.func,
};
