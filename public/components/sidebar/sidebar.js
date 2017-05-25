import React from 'react';
import { ArgTypes } from '../arg_types';
import './sidebar.less';

export const Sidebar = () => (
  <div className="canvas__sidebar">
    <div className="canvas__sidebar--args">
      <ArgTypes />
    </div>
  </div>
);
