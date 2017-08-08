import React from 'react';
import { FunctionFormList } from '../function_form_list';
import PropTypes from 'prop-types';
import './sidebar.less';

export const Sidebar = ({ element }) => (
  <div className="canvas__sidebar">
    <div className="canvas__sidebar--args">
      <FunctionFormList element={element}/>
    </div>
  </div>
);

Sidebar.propTypes = {
  element: PropTypes.object,
};
