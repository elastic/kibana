import React from 'react';
import PropTypes from 'prop-types';
import { FunctionFormList } from '../function_form_list';

export const SidebarComponent = ({ element }) => (
  <div className="canvas__sidebar">
    <div className="canvas__sidebar--args">
      <FunctionFormList element={element} />
    </div>
  </div>
);

SidebarComponent.propTypes = {
  element: PropTypes.object,
};
