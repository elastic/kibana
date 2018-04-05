import React from 'react';
import PropTypes from 'prop-types';
//import { get } from 'lodash';

export const SimpleTemplate = (/*props*/) => {
  // const { argValue, onValueChange, labels } = props;

  return <div className="canvas__argtype--font">Oh look, free beer</div>;
};

SimpleTemplate.displayName = 'FontArgSimpleInput';

SimpleTemplate.propTypes = {
  onValueChange: PropTypes.func.isRequired,
  argValue: PropTypes.any.isRequired,
  renderError: PropTypes.func,
  labels: PropTypes.array,
};
