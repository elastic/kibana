import React from 'react';
import './faux_select.less';
import { PropTypes } from 'prop-types';

export const FauxSelect = ({ children }) => (
  <div className="canvas__faux-select">
    { children }
  </div>
);

FauxSelect.propTypes = {
  children: PropTypes.node,
};
