import React from 'react';
import { FunctionFormList } from '../function_form_list';
import './sidebar.less';

export const Sidebar = () => (
  <div className="canvas__sidebar">
    <div className="canvas__sidebar--args">
      <FunctionFormList />
    </div>
  </div>
);
