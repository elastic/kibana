import React from 'react';
import PropTypes from 'prop-types';
//import { get } from 'lodash';

export const simpleTemplate = (/*props*/) => {
  // const { argValue, onValueChange, labels } = props;

  return (
    <div className="canvas__argtype--font">
      Oh look, free beer
    </div>
  );
};

simpleTemplate.propTypes = {
  onValueChange: PropTypes.func.isRequired,
  argValue: PropTypes.any.isRequired,
  renderError: PropTypes.func,
  labels: PropTypes.array,
};
