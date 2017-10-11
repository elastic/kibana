import React from 'react';
import PropTypes from 'prop-types';

export const SidebarSection = ({ children }) => (
  <div className="canvas__sidebar-section">
    <div className="canvas__sidebar-section-body">
      {children}
    </div>
  </div>
);

SidebarSection.propTypes = {
  children: PropTypes.node,
  title: PropTypes.string,
  tip: PropTypes.string,
};
