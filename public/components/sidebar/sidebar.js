import React from 'react';
import { ArgTypes } from '../arg_types';
import './sidebar.less';
import { Expression } from '../expression';

export const Sidebar = () => (
  <div className="canvas__sidebar">
    <div className="canvas__sidebar--expression">
      <Expression />
    </div>
    <div className="canvas__sidebar--args">
      <ArgTypes />
    </div>
  </div>
);
