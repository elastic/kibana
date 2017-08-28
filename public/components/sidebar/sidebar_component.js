import React from 'react';
import { FunctionFormList } from '../function_form_list';
import PropTypes from 'prop-types';

export const SidebarComponent = ({ element }) => (
  <div className="canvas__sidebar">
    <div className="canvas__sidebar--args">
      <FunctionFormList element={element}/>
    </div>
  </div>
);

SidebarComponent.propTypes = {
  element: PropTypes.object,
};
